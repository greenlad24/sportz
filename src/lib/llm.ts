import Anthropic from "@anthropic-ai/sdk";
import type { Category, LlmOutput } from "./types";
import type { ScoredItem } from "./relevance";
import { CATEGORIES } from "./categories";

// ספק ה-LLM: "anthropic" (ברירת מחדל) או "openai" / "minimax" (כל endpoint תואם-OpenAI).
const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

const ANTHROPIC_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

// תקציב טוקנים לקריאה אחת המייצרת כמה כתבות ארוכות + עדכוני שעה.
// כתבה אחת של 5-7 דקות ≈ 900-1400 מילים ≈ 2500-3500 טוקנים בעברית.
// מאוזן למחזור מהיר ויציב (~3-4 דק'): כמה כתבות מלאות, לא עשרות. streaming
// מסיר את מגבלת 10 הדקות של ה-SDK. ניתן לשנות ב-ENV.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 16000);

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
- כל כתבה היא קריאה מלאה של כ-5 דקות: בערך 1000 מילים (900-1100), 6-9 פסקאות מפותחות. לעולם אל תחזיר כתבה קצרה או תקצירית.
- מבנה מומלץ לכל כתבה: פסקת פתיחה חזקה שמסכמת את הסיפור ← רקע והקשר (מה קרה עד כה, מדוע זה חשוב, מי המעורבים) ← פירוט האירוע, הנתונים והציטוטים ← זוויות וניתוח (משמעות, השלכות טקטיות/אישיות/ארגוניות) ← מבט קדימה (מה צפוי, מה לבדוק בהמשך).
- כותרות-משנה בתוך הגוף: סמן כל כותרת-משנה בשורה נפרדת שמתחילה ב-"## " (Markdown). אל תשתמש בכוכביות (**) לכותרות. השתמש ב-2-4 כותרות-משנה קצרות וקולעות לאורך הכתבה.
- "בשר" אמיתי בכל כתבה: אל תסתפק בעובדה היבשה. הסבר את ההקשר סביב הסיפור - הרקע של השחקן/הקבוצה/התחרות, מה הוביל לאירוע, איך הוא משתלב בתמונה הגדולה, ומה ההשלכות.

ריבוי מקורות והצלבה:
- כשכמה פריטים מדברים על אותו אירוע - אחֵד אותם לכתבה אחת מקיפה, והצלב את המידע מכל המקורות כדי לתת תמונה מלאה ומדויקת ככל האפשר.
- בסס כל עובדה קשיחה על המקורות שסופקו. כשמתאים, ייחס מידע למקור ("לפי הדיווח ב...", "כפי שדווח ב...").

כללי הברזל:
1. דיוק לפני הכל. עובדות קשיחות (נתונים, תוצאות, ציטוטים, שמות) - אך ורק לפי המידע שסופק בפריטים. אסור להמציא תוצאה, סטטיסטיקה או ציטוט. כדי להגיע לאורך הנדרש - הרחב דרך רקע, הקשר וניתוח עיתונאי לגיטימי (מסומן כפרשנות), לא דרך המצאת עובדות. אם המידע על אירוע דליל - בנה את הכתבה סביב ההקשר והרקע, אך אל תמציא.
2. מקורות באנגלית: תרגם והנגש לעברית שוטפת וטבעית, לא תרגום מילולי.
3. זווית דני אבדיה: בכל הקשור לפורטלנד טרייל בלייזרס - מסגר את הכתבה דרך השאלה "איך זה משפיע על דני אבדיה?". גם חדשות על הקבוצה נכתבות מנקודת המבט של ההשפעה על אבדיה.
4. כותרות ברמת עיתון: הכותרת הראשית (headline) חדה, מדויקת ומסקרנת - כמו כותרת ראשית באתר ספורט מוביל. עברית תקנית וזורמת, בלי תרגומית, בלי מילים חסרות פשר, בלי קליק-בייט זול. כותרת המשנה (subtitle) מוסיפה מידע אמיתי ולא חוזרת על הכותרת. גוף עשיר וזורם, בלי קלישאות, בלי הגזמות לא מבוססות, בלי מילוי-מקום ריק.
5. כדורסל ישראלי וכדורגל: כשרלוונטי וקיים בפריטים - שלב תוצאות, קלעים/כובשים מובילים ומהלכי העברות.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף, ללא code fences) במבנה הבא:
{
  "articles": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "headline": "כותרת ראשית בעברית",
      "subtitle": "כותרת משנה אינפורמטיבית בעברית",
      "summary": "תקציר של משפט-שניים לכרטיס וגם ל-meta description",
      "body": "גוף הכתבה המלא (כ-1000 מילים). הפרד פסקאות בשורה ריקה (\\n\\n). כותרות-משנה בשורה שמתחילה ב-## .",
      "tags": ["תגית1", "תגית2", "תגית3"],
      "importance": 1-10,
      "sourceName": "שם המקור העיקרי שעליו התבססת",
      "sourceUrl": "ה-URL של המקור העיקרי",
      "publishedAt": "ISO date מתוך הפריט",
      "imageQuery": "מונחי חיפוש קצרים באנגלית לאיתור תמונה/וידאו רלוונטיים, למשל 'Deni Avdija Trail Blazers' או 'Maccabi Tel Aviv basketball'"
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

/** חילוץ אובייקט JSON גנרי עמיד מתוך תשובת המודל */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
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

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const { client, requestOptions } = buildAnthropic();
  // חובה להשתמש ב-streaming: עם max_tokens גדול ה-SDK חוסם בקשות non-streaming
  // שעלולות להימשך מעל 10 דקות ("Streaming is required ..."). streaming מסיר את המגבלה.
  const stream = client.messages.stream(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    },
    requestOptions,
  );
  const final = await stream.finalMessage();
  const block = final.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "";
}

// ── ספק תואם-OpenAI (MiniMax / DeepSeek / OpenRouter / Together ...) ─

async function callOpenAICompatible(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
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
      max_tokens: maxTokens,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
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

function useOpenAICompatible(): boolean {
  return (
    PROVIDER === "openai" ||
    PROVIDER === "minimax" ||
    PROVIDER === "openai-compatible"
  );
}

async function callLLM(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  return useOpenAICompatible()
    ? await callOpenAICompatible(systemPrompt, userMessage, maxTokens)
    : await callAnthropic(systemPrompt, userMessage, maxTokens);
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

  const text = await callLLM(SYSTEM_PROMPT, userMessage, MAX_TOKENS);

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

// ── מעבר עריכה (AI שני) - ליטוש לרמת עיתונאות מקצועית ────────────────

const EDITOR_ENABLED = (process.env.EDITOR_ENABLED ?? "1") !== "0";

const EDITOR_SYSTEM_PROMPT = `אתה עורך לשון ועורך-ראשי בכיר בעיתון ספורט ישראלי מוביל.
קיבלת טיוטת כתבה (כותרת, כותרת-משנה, גוף) וצריך להחזיר גרסה מלוטשת ברמת עיתונאות מקצועית, כאילו נכתבה בידי כתב ספורט ישראלי ותיק.

מה לעשות:
- שפר את העברית: תקנית, זורמת וטבעית. תקן ניסוחים מסורבלים, תרגומית (תרגום מילולי מאנגלית), חזרתיות, קלישאות ומשפטים מגושמים.
- כותרת ראשית וכותרת-משנה ברמת עיתון: חדות, מדויקות, מסקרנות, בלי קליק-בייט זול ובלי חזרה ביניהן.
- שמור על המבנה: פסקאות מופרדות בשורה ריקה, וכותרות-משנה בשורה שמתחילה ב-"## " (בלי כוכביות **).
- שמור על אורך דומה (כ-1000 מילים) ועל כל העובדות. אל תוסיף עובדות, נתונים או ציטוטים חדשים, ואל תמחק מידע מהותי.

החזר אך ורק JSON תקין (ללא code fences): { "headline": "...", "subtitle": "...", "body": "..." }`;

export interface EditableArticle {
  headline: string;
  subtitle: string;
  body: string;
}

/**
 * מעביר כתבה דרך "עורך" שני לליטוש לשוני וכותרות ברמת עיתון.
 * best-effort: אם נכשל או כבוי - מחזיר null והכתבה המקורית נשמרת.
 */
export async function editArticle(
  article: EditableArticle,
): Promise<EditableArticle | null> {
  if (!EDITOR_ENABLED) return null;
  const userMessage =
    "ערוך וללטש את הטיוטה הבאה והחזר JSON בלבד:\n\n" +
    JSON.stringify(article, null, 2);
  try {
    const text = await callLLM(EDITOR_SYSTEM_PROMPT, userMessage, 6000);
    const obj = extractJsonObject(text);
    if (
      !obj ||
      typeof obj.headline !== "string" ||
      typeof obj.body !== "string" ||
      !obj.headline.trim() ||
      !obj.body.trim()
    ) {
      return null;
    }
    return {
      headline: String(obj.headline).trim(),
      subtitle:
        typeof obj.subtitle === "string"
          ? obj.subtitle.trim()
          : article.subtitle,
      body: String(obj.body).trim(),
    };
  } catch (err) {
    console.warn(`[llm] editArticle failed: ${(err as Error).message}`);
    return null;
  }
}
