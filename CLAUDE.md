# SPORTZ — operator & developer notes

Hebrew sports news site, **Deni Avdija–first**, that auto-generates original
articles from live news using Claude. Next.js 14 (App Router) + TypeScript +
Tailwind. Runs on a DigitalOcean droplet via Docker Compose (file storage),
or on Vercel (Upstash Redis storage).

## How the news engine works (the core loop)

`runRefresh()` in `src/lib/engine.ts` is the whole pipeline, run on a schedule:

1. **Fetch** — `src/lib/sources.ts` lists Google News RSS searches + a few
   direct feeds. `src/lib/rss.ts` and `src/lib/scrape.ts` pull the raw items.
   Avdija queries use `when:1d` (last 24h).
2. **Select (free filter)** — `src/lib/relevance.ts` `selectCandidates()`
   scores by keyword relevance + freshness, drops near-duplicate titles, caps
   per category. This is what keeps the Claude token bill low.
3. **Dedupe vs processed** — links already sent to the LLM (last 96h) are
   skipped (`store.getProcessedLinks`). This is the main cost saver.
4. **Generate** — `src/lib/llm.ts` `generateArticles()` makes **one** Claude
   call that returns all articles + "hourly updates" as JSON. The prompt also
   receives `alreadyCovered` (recent headlines/subtopics — never rewrite a
   covered topic) and `internalArticles` (for internal links).
5. **Enrich media** — per article, `src/lib/media.ts`: `findImage()` (Brave
   Image Search, US sites, past week, with credit) and `findVideo()`
   (YouTube). Both best-effort; gated on env keys.
6. **Store** — `store.mergeArticles()` dedupes by id/sourceUrl and persists.

Target: ~10 articles/run, Avdija prioritized then filled from Israeli
basketball + world football (`computeTargets`, soft mix). Volume is bounded by
real news — quiet hours produce fewer; the model must not fabricate filler.

## Scheduling

- `docker-compose.yml` runs a `scheduler` service (`scripts/scheduler.mjs`)
  that POSTs `/api/refresh?key=$CRON_SECRET` every `REFRESH_INTERVAL_MS`
  (default 5 min). An in-memory lock prevents overlapping runs, so most
  triggers return `{"started":false,"reason":"already running"}` — normal.
- Manual trigger:
  `curl -s -X POST "http://localhost:3000/api/refresh?key=$CRON_SECRET"`

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

- `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` — the writer. `CLAUDE_MODEL`
  (default `claude-opus-4-8`). Or `LLM_PROVIDER=openai` + `LLM_BASE_URL/KEY/MODEL`.
- `CRON_SECRET` — guards `/api/refresh` and `/api/status`.
- `BRAVE_API_KEY` — article images. `YOUTUBE_API_KEY` — article videos.
- `ARTICLES_PER_RUN` (10), `LOOKBACK_HOURS` (24), `LLM_MAX_TOKENS` (30000),
  `REFRESH_INTERVAL_MS` (300000).
- `UPSTASH_REDIS_REST_URL/TOKEN` — only for Vercel; droplet uses files.

## Known issues / gotchas

- Some feeds 403 server-side (SLAM, HoopsHype, the Feedspot `fs-*` ones).
  Harmless — Google News + ESPN NBA + Reddit carry the volume.
- The whole run is **one large Claude call**. If logs show
  `[llm] failed to parse JSON output`, the output likely truncated — lower
  `ARTICLES_PER_RUN` or raise `LLM_MAX_TOKENS`. (A per-article generation mode
  is the planned fix if this recurs.)
- Article bodies are Markdown-lite: `## ` subheads and `[text](/article/slug)`
  internal links, rendered by `src/components/ArticleBody.tsx`.

## Conventions

- Run `npx tsc --noEmit` and `npm run build` before committing.
- UI strings and prompts are in Hebrew; keep that voice.
- Do not commit secrets. Don't fabricate sports facts in prompts/seed data.
