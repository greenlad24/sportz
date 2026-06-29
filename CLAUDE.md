# SPORTZ — operator & developer notes

Hebrew sports news site, **Deni Avdija–first**, that auto-generates original
articles from live news using Claude. Next.js 14 (App Router) + TypeScript +
Tailwind. Runs on a DigitalOcean droplet via Docker Compose (file storage),
or on Vercel (Upstash Redis storage).

## How the news engine works (two-phase pipeline)

`src/lib/engine.ts` splits into two phases on independent timers. The writer is
**free** (Gemini Flash via the OpenAI-compatible path) — server cost only.

**Phase 1 — `planRefresh()` (every ~15 min, `/api/plan`):**
1. **Fetch** — `src/lib/sources.ts` (Google News RSS + direct feeds) via
   `rss.ts` + `scrape.ts` (Israeli sites). Refreshes broadcasts too.
2. **Select + cluster (free)** — `relevance.ts selectCandidates()` scores by
   keyword + freshness and **clusters** same-story sources into one group
   (`related[]`).
3. **Dedupe vs processed links** — already-considered links (96h) are skipped.
4. **Full text** — `extract.ts enrichWithArticleText()` scrapes each group's
   primary + related. **Resolves Google News redirect links** to the publisher
   URL first (base64 decode → redirect-follow), so full text is actually
   fetched (~half of items in practice).
5. **Hard freshness gate** — after enrichment, `extract.ts` also pulls each
   item's **real publish date** (JSON-LD `datePublished` / meta tags). A group
   is kept only if that date is within `FRESH_WINDOW_HOURS` (default 24). Items
   with an unknown/unverifiable date are **dropped** — this is the fix for "old
   news that shows up on Google News but isn't really news." Missing RSS/scrape
   dates are no longer stamped `now` (they become `""` → fail the gate unless a
   real date is recovered).
6. **Topic dedup → grow, not just drop** — `dedup.ts`: each group gets a
   `topicSignature`. If it matches an **existing published article**
   (`findDuplicateTopic` returns its id), the group is enqueued as an
   **update** (`QueuedGroup.updateOf`) that will *grow* that article instead of
   being dropped or duplicated. If it only matches another group accepted in the
   same run, it's dropped. Code gate, not a prompt hint.
7. **Enqueue** — survivors (new + update groups) go to `queue.json` (`store.ts`).

**Phase 2 — `writeNext()` (every ~2 min, `/api/write`):**
1. **Pop one group** (highest score) from the queue.
2. **Update path** — if the group has `updateOf` (a developing story), load that
   article and call `llm.expandArticle()` to **merge the new facts into it and
   grow it**; `store.updateArticle()` saves it in place (same id/slug, bumps
   `publishedAt` to the latest development, sets `updatedAt`). UI shows an
   "עודכן" label. If the original was trimmed away, falls back to a new write.
3. **New article path** — re-check dedup, then `llm.generateArticles()` writes
   **one** article from the whole group (multi-source synthesis) + updates, as
   JSON. For **avdija** groups, real verified season stats from `stats.ts`
   (balldontlie) are injected so the model can add numbers without fabricating.
   The **dictionary** (`src/lib/dictionary.ts`) enforces correct Hebrew — no
   second proofread pass.
4. **Enrich media** (`media.ts`: Brave image + YouTube video, best-effort).
   Broken/expired image URLs fall back to a gradient placeholder client-side
   (`ArticleImage`/`TileImage` `onError`).
5. **Store** — `store.mergeArticles()` dedupes by id/sourceUrl and persists.

Result: a continuous trickle (one article every ~2 min), each synthesized from
a group of related sources, with no cross-day duplicates. Volume is bounded by
real news — the model must not fabricate filler.

## Scheduling

- `docker-compose.yml` runs a `scheduler` service (`scripts/scheduler.mjs`)
  with **two timers**: POSTs `/api/plan` every `PLAN_INTERVAL_MS` (default
  15 min) and `/api/write` every `WRITE_INTERVAL_MS` (default 2 min). Each
  phase has its own in-memory lock; overlapping triggers return
  `{"started":false,"reason":"already running"}` — normal.
- Manual full run (plan + drain whole queue):
  `curl -s -X POST "http://localhost:3000/api/refresh?key=$CRON_SECRET"`
- Write more than one in a call: `/api/write?key=...&n=5`.

## Operating on the droplet

- Logs: `docker compose logs -f web` — look for `[refresh] done: {...}`.
- Health in one call: `GET /api/status?key=$CRON_SECRET` — last run result,
  article count, in-progress flag, last error, media-keys enabled.
- Data lives in the `sportz-data` volume at `/app/.data/*.json`
  (articles.json, links.json, updates.json, comments.json).
- Rebuild/deploy: `git pull && docker compose up -d --build`.
- Read `CRON_SECRET`:
  `KEY=$(grep -E '^CRON_SECRET=' .env | sed -E 's/^CRON_SECRET=//; s/^"//; s/"$//')`

## Env vars (see `.env.example`)

- **Writer (free default):** `LLM_PROVIDER=openai` +
  `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai` +
  `LLM_MODEL=gemini-2.5-flash` + `LLM_API_KEY` (free key from aistudio.google.com).
  Swappable to Groq/MiniMax (same protocol) or `LLM_PROVIDER=anthropic` +
  `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` (paid).
- `CRON_SECRET` — guards `/api/plan`, `/api/write`, `/api/refresh`, `/api/status`.
- `BRAVE_API_KEY` — article images. `YOUTUBE_API_KEY` — article videos.
- `BALLDONTLIE_API_KEY` — free NBA stats for Avdija articles (disabled if unset);
  `NBA_SEASON` (2025 = 2025-26), `STATS_TTL_HOURS` (6).
- `FRESH_WINDOW_HOURS` (24) — hard freshness gate on the real publish date.
- `ARTICLES_PER_RUN` (10), `LOOKBACK_HOURS` (24), `ARTICLE_MAX_TOKENS` (8000).
- `PLAN_INTERVAL_MS` (900000), `WRITE_INTERVAL_MS` (120000), `QUEUE_TTL_HOURS` (6).
- `DEDUP_WINDOW_HOURS` (168), `DEDUP_SIMILARITY` (0.5) — topic-dedup tuning.
- `UPSTASH_REDIS_REST_URL/TOKEN` — only for Vercel; droplet uses files.

## Known issues / gotchas

- Some feeds 403 server-side (SLAM, HoopsHype, the Feedspot `fs-*` ones).
  Harmless — Google News + ESPN NBA + Reddit carry the volume.
- Writing is now **one LLM call per article** (per group), not one big call.
  If logs show `[llm] failed to parse JSON output`, that single article was
  skipped — raise `ARTICLE_MAX_TOKENS` if outputs truncate (`finish_reason:
  length`). Gemini Flash "thinks" by default, consuming part of the budget.
- Google News links that don't decode fall back to the RSS summary (no full
  text). `[plan] full text: N/M items` in logs shows the hit rate (~half).
- Article bodies are Markdown-lite: `## ` subheads and `[text](/article/slug)`
  internal links, rendered by `src/components/ArticleBody.tsx`.

## Autonomous management playbook (on-droplet instance)

You (the Claude Code instance running on the droplet) are authorized to manage
this site end to end: monitor health, fix bugs, and ship improvements to the
**live** site, with full auto-deploy and health-checked rollback.

**Branch model: `master` is the single source of truth.** You work directly on
`master` and push to it. Always `git pull --rebase origin master` before you
start so you don't diverge.

**Deploy mode: full auto.** You may deploy to production yourself. Every change
follows this loop — no exceptions:

1. **Sync.** `git checkout master && git pull --rebase origin master`.
2. **Verify.** `npx tsc --noEmit` AND `npm run build` must both pass. If either
   fails, do not deploy.
3. **Deploy.** Run `./scripts/deploy.sh`. It builds, brings up the container,
   health-checks `http://localhost:3000/`, and **auto-rolls-back to the last
   known-good commit** if the site doesn't return 200. If the build itself
   fails, the old container keeps running (safe).
4. **Confirm.** After a healthy deploy, check
   `GET /api/status?key=$CRON_SECRET` and, when relevant, trigger a refresh and
   watch for `[refresh] done` in `docker compose logs web`.
5. **Commit & push** to `master` with a clear message. Only push code that
   passed step 2 and deployed healthy in step 3.

**If `deploy.sh` rolls back:** the site is restored to the last-good commit and
HEAD is left there. Diagnose the failure, fix forward, re-verify, and
re-deploy. Never re-run the same broken deploy hoping it sticks.

**Guardrails (hard rules):**
- Never commit secrets. `.env` stays on the box and out of git.
- Never delete or overwrite the `.data` volume (live articles/links/comments).
- Never fabricate sports facts in prompts, seed data, or fallbacks.
- Keep the Hebrew, Avdija-first editorial voice.
- Keep changes small and reversible; one concern per deploy.

**What "improve the site" means here (backlog ideas):** per-article generation
mode if you ever see JSON-truncation in logs; better image-relevance queries;
more/healthier news sources (replace the 403 feeds); richer internal linking;
performance and SEO. Prioritize anything that's currently broken first.

**Routine health check (safe to run anytime):**
`curl -s "http://localhost:3000/api/status?key=$CRON_SECRET" | jq`

## Conventions

- Run `npx tsc --noEmit` and `npm run build` before committing.
- UI strings and prompts are in Hebrew; keep that voice.
- Do not commit secrets. Don't fabricate sports facts in prompts/seed data.
