import Anthropic from "@anthropic-ai/sdk";
import type { Category, LlmOutput } from "./types";
import type { ScoredItem } from "./relevance";
import { CATEGORIES } from "./categories";

// ספק ה-LLM: "anthropic" (ברירת מחדל) או "openai" / "minimax" (כל endpoint תואם-OpenAI).
const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

const ANTHROPIC_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

// תקציב טוקנים נדיב לקריאה אחת המייצרת כמה כתבות ארוכות + עדכוני שעה.
// כתבה אחת של 5-7 דקות ≈ 900-1400 מילים ≈ 2500-3500 טוקנים בעברית.
// תקציב גבוה מונע קטיעה של ה-JSON (שמובילה לאפס כתבות). ניתן לשנות ב-ENV.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 32000);

/**
 * מדריך הסגנון + ההנחיות. פרומפט יציב (לא משתנה בין ריצות) ולכן בספק Anthropic
 * הוא מסומן ל-prompt caching. זהו גם החלק שמכתיב את איכות הכתיבה בעברית.
 *
 * עיקרון מרכזי: כל כתבה היא קריאה שלמה ומעמיקה של 5-7 דקות - לא תקציר.
 */
const SYSTEM_PROMPT = `אתה עורך ראשי וכתב בכיר באתר חדשות ספורט ישראלי בשם "SPORTZ".
אתה כותב בעברית עיתונאית, זורמת, אנרגטית ומדויקת - בסגנון של אתרי הספורט המובילים בישראל (כמו sport5 ו-ONE).

המשימה: לקבל פריטי חדשות גולמיים (חלקם בעברית, חלקם באנגלית ממקורות אמריקאיים) ולהפוך אותם לכתבות מקוריות, שלמות ומעמיקות בעברית - כולן בקריאה אחת.

אורך ועומק - דרישת חובה לכל כתבה:
- כל כתבה היא קריאה מלאה של 5-7 דקות: 900-1400 מילים, 7-12 פסקאות מפותחות. לעולם אל תחזיר כתבה קצרה או תקצירית.
- מבנה מומלץ לכל כתבה: פסקת פתיחה חזקה שמסכמת את הסיפור ← רקע והקשר (מה קרה עד כה, מדוע זה חשוב, מי המעורבים) ← פירוט האירוע, הנתונים והציטוטים ← זוויות וניתוח (משמעות, השלכות טקטיות/אישיות/ארגוניות) ← מבט קדימה (מה צפוי, מה לבדוק בהמשך). אפשר לשלב כותרות-משנה קצרות בתוך הגוף כשורות נפרדות.
- "בשר" אמיתי בכל כתבה: אל תסתפק בעובדה היבשה. הסבר את ההקשר סביב הסיפור - הרקע של השחקן/הקבוצה/התחרות, מה הוביל לאירוע, איך הוא משתלב בתמונה הגדולה, ומה ההשלכות.

ריבוי מקורות והצלבה:
- כשכמה פריטים מדברים על אותו אירוע - אחֵד אותם לכתבה אחת מקיפה, והצלב את המידע מכל המקורות כדי לתת תמונה מלאה ומדויקת ככל האפשר.
- בסס כל עובדה קשיחה על המקורות שסופקו. כשמתאים, ייחס מידע למקור ("לפי הדיווח ב...", "כפי שדווח ב...").

כללי הברזל:
1. דיוק לפני הכל. עובדות קשיחות (נתונים, תוצאות, ציטוטים, שמות) - אך ורק לפי המידע שסופק בפריטים. אסור להמציא תוצאה, סטטיסטיקה או ציטוט. כדי להגיע לאורך הנדרש - הרחב דרך רקע, הקשר וניתוח עיתונאי לגיטימי (מסומן כפרשנות), לא דרך המצאת עובדות. אם המידע על אירוע דליל - בנה את הכתבה סביב ההקשר והרקע, אך אל תמציא.
2. מקורות באנגלית: תרגם והנגש לעברית שוטפת וטבעית, לא תרגום מילולי.
3. זווית דני אבדיה: בכל הקשור לפורטלנד טרייל בלייזרס - מסגר את הכתבה דרך השאלה "איך זה משפיע על דני אבדיה?". גם חדשות על הקבוצה נכתבות מנקודת המבט של ההשפעה על אבדיה.
4. סגנון: כותרת קליטה וחדה, כותרת משנה אינפורמטיבית, גוף עשיר וזורם. בלי קלישאות, בלי הגזמות לא מבוססות, בלי מילוי-מקום ריק.
5. כדורסל ישראלי וכדורגל: כשרלוונטי וקיים בפריטים - שלב תוצאות, קלעים/כובשים מובילים ומהלכי העברות.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף, ללא code fences) במבנה הבא:
{
  "articles": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "headline": "כותרת ראשית בעברית",
      "subtitle": "כותרת משנה אינפורמטיבית בעברית",
      "summary": "תקציר של משפט-שניים לכרטיס וגם ל-meta description",
      "body": "גוף הכתבה המלא (900-1400 מילים). הפרד פסקאות בשורה ריקה (\\n\\n).",
      "tags": ["תגית1", "תגית2", "תגית3"],
      "importance": 1-10,
      "sourceName": "שם המקור העיקרי שעליו התבססת",
      "sourceUrl": "ה-URL של המקור העיקרי",
      "publishedAt": "ISO date מתוך הפריט"
    }
  ],
  "updates": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "text": "עובדה אחת תמציתית ומאומתת בעברית - הרכב פתיחה, תוצאת משחק, דיווח של כתב, או שמועה שפורסמה. מבוססת אך ורק על הפריטים שסופקו."
    }
  ]
}

הנחיות לעדכונים (updates): אלו 'עדכוני השעה' - העובדות הגולמיות שעליהן מבוססות הכתבות (הרכבים, תוצאות, דיווחי כתבים, שמועות שפורסמו). החזר 8-15 עדכונים קצרים, משפט אחד כל אחד, מגוונים ומבוססים אך ורק על הפריטים שסופקו. אל תמציא.
הקפד על מספר הכתבות המבוקש לכל קטגוריה (target). אם אין מספיק פריטים איכותיים בקטגוריה - החזר פחות, אל תמציא. חשוב מכל: עדיף פחות כתבות אך כל אחת מעמיקה ומלאה, מאשר הרבה כתבות קצרות.`;

function itemPayload(it: ScoredItem) {
  return {
    title: it.title,
    summary: it.summary.slice(0, 600),
    source: it.source,
    lang: it.lang,
    url: it.link,
    publishedAt: it.publishedAt,
  };
}

function buildUserMessage(
  candidates: Record<Category, ScoredItem[]>,
  targets: Record<Category, number>,
): string {
  const payload: Record<string, unknown> = { targets, categories: {} };
  const cats = payload.categories as Record<string, unknown>;

  (Object.keys(candidates) as Category[]).forEach((cat) => {
    cats[cat] = {
      label: CATEGORIES[cat].label,
      target: targets[cat],
      items: candidates[cat].map(itemPayload),
    };
  });

  return (
    "הנה פריטי החדשות הגולמיים שנאספו. כתוב כתבות מעמיקות בעברית (5-7 דקות קריאה כל אחת) לפי ההנחיות, " +
    "אחֵד פריטים על אותו אירוע והצלב מקורות, והחזר JSON בלבד.\n\n" +
    JSON.stringify(payload, null, 2)
  );
}

/** חילוץ JSON עמיד מתוך תשובת המודל */
function extractJson(text: string): LlmOutput | null {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (!obj || !Array.isArray(obj.articles)) return null;
    return {
      articles: obj.articles,
      updates: Array.isArray(obj.updates) ? obj.updates : [],
    };
  } catch {
    return null;
  }
}

const VALID_CATS = ["avdija", "israeli_basketball", "world_football"];

// ── ספק Anthropic (Claude) ─────────────────────────────────────────

function buildAnthropic(): {
  client: Anthropic;
  requestOptions?: { headers: Record<string, string> };
} {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey && !authToken) {
    throw new Error(
      "missing credentials: set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN",
    );
  }
  const client = authToken
    ? new Anthropic({ authToken, apiKey: null })
    : new Anthropic({ apiKey });
  const isOAuth =
    !!authToken &&
    (process.env.ANTHROPIC_OAUTH === "1" || /^sk-ant-oat/.test(authToken));
  return {
    client,
    requestOptions: isOAuth
      ? { headers: { "anthropic-beta": "oauth-2025-04-20" } }
      : undefined,
  };
}

async function callAnthropic(userMessage: string): Promise<string> {
  const { client, requestOptions } = buildAnthropic();
  const response = await client.messages.create(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    },
    requestOptions,
  );
  const block = response.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "";
}

// ── ספק תואם-OpenAI (MiniMax / DeepSeek / OpenRouter / Together ...) ─

async function callOpenAICompatible(userMessage: string): Promise<string> {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!base || !key || !model) {
    throw new Error(
      "missing config: set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL for the OpenAI-compatible provider",
    );
  }
  const url = `${base.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ── נקודת כניסה אחידה ──────────────────────────────────────────────

/**
 * מייצר את כל הכתבות + עדכוני השעה בקריאה אחת לכל מחזור.
 * כל כתבה היא קריאה מעמיקה ומלאה (5-7 דקות) המאחדת ומצליבה מקורות.
 */
export async function generateArticles(
  candidates: Record<Category, ScoredItem[]>,
  targets: Record<Category, number>,
): Promise<LlmOutput> {
  const total = Object.values(candidates).reduce((n, a) => n + a.length, 0);
  if (total === 0) return { articles: [], updates: [] };

  const userMessage = buildUserMessage(candidates, targets);

  const text =
    PROVIDER === "openai" ||
    PROVIDER === "minimax" ||
    PROVIDER === "openai-compatible"
      ? await callOpenAICompatible(userMessage)
      : await callAnthropic(userMessage);

  const parsed = extractJson(text);
  if (!parsed) {
    console.warn(`[llm] failed to parse JSON output (provider=${PROVIDER})`);
    return { articles: [], updates: [] };
  }

  const articles = parsed.articles.filter(
    (a) =>
      a &&
      typeof a.headline === "string" &&
      typeof a.body === "string" &&
      VALID_CATS.includes(a.category),
  );
  const updates = parsed.updates.filter(
    (u) =>
      u &&
      typeof u.text === "string" &&
      u.text.trim().length > 0 &&
      VALID_CATS.includes(u.category),
  );

  return { articles, updates };
}
