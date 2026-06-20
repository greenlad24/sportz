# SPORTZ — אתר חדשות ספורט בעברית 🏀⚽

אתר חדשות ספורט בעברית (RTL), ממוקד מובייל ודsktop, שמתעדכן **אוטומטית כל 5 דקות**.
מנוע הניוז שואב חדשות ממגוון מקורות בארץ ובארה"ב, מסנן את הרלוונטי והמיידי, וכותב כתבות
בעברית עיתונאית בעזרת Claude.

## תמהיל התוכן

| נושא | משקל | מקורות |
|------|------|--------|
| **דני אבדיה / פורטלנד בלייזרס** | ~70% | מקורות ישראליים + אמריקאיים. נקודת המבט תמיד: איך זה משפיע על אבדיה. |
| **כדורסל ישראלי** (מכבי ת"א, הפועל ת"א, הפועל י-ם) | ~20% | אתרי ספורט ישראליים — תוצאות, קלעים, העברות. |
| **כדורגל עולמי** (ליגת האלופות, ליגות בכירות, נבחרת ישראל, מונדיאל) | ~10% | מקורות בעברית. |

## ארכיטקטורה

```
RSS / Google News  ──▶  סינון חינמי (ניקוד+טריות+דה-דופ)  ──▶  Claude (קריאה אחת)  ──▶  אחסון  ──▶  עמודים SSR
   (src/lib/rss)          (src/lib/relevance)                  (src/lib/claude)        (store)      (App Router)
                                          המתזמר: src/lib/engine.ts
```

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind. עברית RTL, רספונסיבי, **SSR/ISR** — HTML מלא ומהיר שגוגל קורא בקלות.
- **מנוע**: שאיבת RSS → סינון בקוד (חינם) → יצירת כתבות ב-Claude → שמירה.
- **תזמון**: Vercel Cron מפעיל את `/api/refresh` כל 5 דקות (`vercel.json`).

## אופטימיזציית עלות (נמוכה ככל האפשר, באיכות גבוהה)

1. **דה-דופ לפני קריאת ה-API** (החיסכון הגדול ביותר) — יומן קישורים זוכר מה כבר עובד, וה-API נקרא **רק כשיש תוכן חדש באמת**. רוב חלונות ה-5 דקות לא מייצרים חדשות חדשות → רוב הריצות הן no-op חינמי.
2. **סינון חינמי בקוד** לפני שליחה ל-LLM — ניקוד רלוונטיות, סינון לפי טריות, והסרת כפילויות. חוסך דרמטית בטוקנים.
3. **קריאה אחת מאוחדת** ל-LLM בכל ריצה (לא קריאה לכל כתבה).
4. **Prompt Caching** (TTL שעה) על פרומפט הסגנון היציב (ספק Anthropic).
5. **ספק/מודל מתחלף** דרך `LLM_PROVIDER`:
   - `anthropic` — Claude, העברית הכי טובה (`CLAUDE_MODEL`: sonnet-4-6 / opus-4-8 / haiku-4-5).
   - `openai` / `minimax` — כל endpoint תואם-OpenAI (MiniMax/DeepSeek/OpenRouter) דרך `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL`. זול יותר, אך בדקו את איכות העברית.

## SEO ואינדוקס (Google News + רשתות חברתיות)

- `generateMetadata` לכל עמוד: Open Graph + Twitter Cards + canonical.
- **JSON-LD `NewsArticle`** בכל עמוד כתבה — תוצאות עשירות ו-Google News.
- `sitemap.xml` דינמי + **`news-sitemap.xml`** ייעודי ל-Google News (48 שעות אחרונות).
- `robots.txt` + **RSS** (`/feed.xml`) לסינדיקציה.
- HTML מלא בצד השרת (SSR/ISR), `lang="he"`, `dir="rtl"`.

> מומלץ להוסיף `public/og.png` (תמונת ברירת מחדל לשיתוף) ולקשר אליה ב-metadata לחוויית שיתוף עשירה יותר.

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # מלא ANTHROPIC_API_KEY ו-NEXT_PUBLIC_SITE_URL
npm run dev                  # http://localhost:3000
```

לפני שמנוע הניוז רץ בפעם הראשונה, מוצגות כתבות לדוגמה (`src/lib/seed.ts`).
להרצת המנוע ידנית (כותב כתבות אמיתיות לאחסון המקומי `.data/`):

```bash
npm run refresh
# או דרך ה-API:
curl http://localhost:3000/api/refresh
```

## פריסה ל-DigitalOcean Droplet (מומלץ)

הדרך הנוחה ביותר: Docker עם מתזמן פנימי (כל 5 דקות) ואחסון קבצים מתמשך —
**ללא צורך בבסיס נתונים חיצוני**. מדריך מלא: **[DEPLOY-DROPLET.md](./DEPLOY-DROPLET.md)**.

```bash
cp .env.example .env   # מלא ANTHROPIC_API_KEY, NEXT_PUBLIC_SITE_URL, CRON_SECRET
docker compose up -d --build
```

## פריסה ל-Vercel

1. דחוף את הריפו ל-GitHub וייבא ב-Vercel.
2. הגדר משתני סביבה (ראה `.env.example`):
   - `ANTHROPIC_API_KEY` (חובה)
   - `NEXT_PUBLIC_SITE_URL` (כתובת הדומיין)
   - `CRON_SECRET` (מחרוזת אקראית — מאבטח את `/api/refresh`)
   - `CLAUDE_MODEL` (אופציונלי)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — **חובה לפרודקשן** לאחסון מתמשך
     (ב-Vercel ה-filesystem אפמרי). צור DB חינמי ב-[Upstash](https://upstash.com/).
3. `vercel.json` כבר מגדיר Cron כל 5 דקות ל-`/api/refresh`.

> ללא Upstash, האחסון נופל חזרה לקבצים מקומיים (`.data/`) — מתאים לפיתוח בלבד, לא יישמר ב-Vercel.

## נקודות קצה (API)

| נתיב | תיאור |
|------|-------|
| `GET/POST /api/refresh` | מפעיל את מנוע הניוז (מאובטח ב-`CRON_SECRET`). Vercel Cron קורא לו כל 5 דק'. |
| `GET /api/articles` | JSON של הכתבות (פרמטרים: `?category=`, `?limit=`). |
| `/feed.xml` | פיד RSS. |
| `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt` | SEO. |

## מבנה הפרויקט

```
src/
  app/                 עמודים (App Router) + נקודות API + SEO
    page.tsx           עמוד ראשי
    category/[slug]/    עמוד קטגוריה
    article/[id]/       עמוד כתבה (+ JSON-LD)
    api/refresh/        מנוע הניוז (cron)
    sitemap.ts, robots.ts, feed.xml/, news-sitemap.xml/
  components/           רכיבי UI
  lib/
    sources.ts          הגדרת מקורות RSS / Google News
    rss.ts              שאיבה ופענוח RSS/Atom
    relevance.ts        ניקוד וסינון (חינם)
    claude.ts           יצירת כתבות + prompt caching
    engine.ts           המתזמר
    store.ts            אחסון (Upstash / קבצים)
    seed.ts             כתבות לדוגמה
```
