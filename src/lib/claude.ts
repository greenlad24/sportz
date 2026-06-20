import Anthropic from "@anthropic-ai/sdk";
import type { Category, GeneratedArticle } from "./types";
import type { ScoredItem } from "./relevance";
import { CATEGORIES } from "./categories";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

/**
 * מדריך הסגנון + ההנחיות. זהו פרומפט יציב (לא משתנה בין ריצות) ולכן
 * אנו מסמנים אותו ל-prompt caching עם TTL של שעה. בריצה כל 5 דקות,
 * רוב הטוקנים של הפרומפט הזה ייקראו מהמטמון (~0.1x מהעלות) -
 * זה החיסכון העיקרי בעלות מול שמירה על איכות.
 */
const SYSTEM_PROMPT = `אתה עורך ראשי וכתב בכיר באתר חדשות ספורט ישראלי בשם "SPORTZ".
אתה כותב בעברית עיתונאית, זורמת, אנרגטית ומדויקת - בסגנון של אתרי הספורט המובילים בישראל (כמו sport5).

המשימה: לקבל פריטי חדשות גולמיים (חלקם בעברית, חלקם באנגלית ממקורות אמריקאיים) ולהפוך אותם לכתבות מקוריות בעברית.

כללי הברזל:
1. דיוק לפני הכל. התבסס אך ורק על המידע שסופק בפריטים. אל תמציא עובדות, נתונים, ציטוטים או תוצאות. אם המידע דליל - כתוב כתבה קצרה וזהירה.
2. מקורות באנגלית: תרגם והנגש לעברית שוטפת וטבעית, לא תרגום מילולי.
3. זווית דני אבדיה: כשמדובר בפורטלנד טרייל בלייזרס - תמיד מסגר את הכתבה דרך השאלה "איך זה משפיע על דני אבדיה?". גם חדשות על הקבוצה צריכות להיכתב מנקודת המבט של ההשפעה על אבדיה.
4. איחוד כפילויות: אם כמה פריטים מדברים על אותו אירוע, אחד אותם לכתבה אחת.
5. סגנון: כותרת קליטה וחדה, כותרת משנה אינפורמטיבית, גוף של 2-4 פסקאות קצרות. בלי קלישאות מיותרות, בלי הגזמות שלא מבוססות.
6. כדורסל ישראלי: כשרלוונטי - ציין תוצאות, קלעים מובילים ומהלכי העברות, אם המידע קיים בפריטים.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף, ללא code fences) במבנה הבא:
{
  "articles": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "headline": "כותרת ראשית בעברית",
      "subtitle": "כותרת משנה בעברית",
      "summary": "תקציר של משפט-שניים לכרטיס וגם ל-meta description",
      "body": "גוף הכתבה. הפרד פסקאות בשורה ריקה (\\n\\n).",
      "tags": ["תגית1", "תגית2"],
      "importance": 1-10,
      "sourceName": "שם המקור העיקרי שעליו התבססת",
      "sourceUrl": "ה-URL של המקור העיקרי",
      "publishedAt": "ISO date מתוך הפריט"
    }
  ]
}

הקפד על מספר הכתבות המבוקש לכל קטגוריה. אם אין מספיק פריטים איכותיים בקטגוריה - החזר פחות, אל תמציא.`;

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
      items: candidates[cat].map((it) => ({
        title: it.title,
        summary: it.summary.slice(0, 400),
        source: it.source,
        lang: it.lang,
        url: it.link,
        publishedAt: it.publishedAt,
      })),
    };
  });

  return (
    "הנה פריטי החדשות הגולמיים שנאספו ב-5 הדקות האחרונות. " +
    "כתוב כתבות בעברית לפי ההנחיות והחזר JSON בלבד.\n\n" +
    JSON.stringify(payload, null, 2)
  );
}

/** חילוץ JSON עמיד מתוך תשובת המודל */
function extractJson(text: string): { articles: GeneratedArticle[] } | null {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (obj && Array.isArray(obj.articles)) return obj;
    return null;
  } catch {
    return null;
  }
}

/**
 * בונה לקוח Anthropic. תומך בשתי שיטות אימות:
 *  - ANTHROPIC_API_KEY  -> נשלח כ-x-api-key
 *  - ANTHROPIC_AUTH_TOKEN -> נשלח כ-Authorization: Bearer (access token / OAuth)
 * אם ה-token הוא OAuth (sk-ant-oat...) מוסיפים את כותרת ה-beta הנדרשת.
 */
function buildClient(): {
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

  // העדפה ל-auth token כשהוגדר (מבטל את ה-x-api-key כדי לא לשלוח שתי כותרות).
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

export async function generateArticles(
  candidates: Record<Category, ScoredItem[]>,
  targets: Record<Category, number>,
): Promise<GeneratedArticle[]> {
  const total = Object.values(candidates).reduce((n, a) => n + a.length, 0);
  if (total === 0) return [];

  const { client, requestOptions } = buildClient();

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // prompt caching: הפרומפט היציב נשמר במטמון לשעה -> ריצות חוזרות זולות
          cache_control: { type: "ephemeral", ttl: "1h" },
        },
      ],
      messages: [
        { role: "user", content: buildUserMessage(candidates, targets) },
      ],
    },
    requestOptions,
  );

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "";
  const parsed = extractJson(text);
  if (!parsed) {
    console.warn("[claude] failed to parse JSON output");
    return [];
  }

  // ולידציה בסיסית
  return parsed.articles.filter(
    (a) =>
      a &&
      typeof a.headline === "string" &&
      typeof a.body === "string" &&
      ["avdija", "israeli_basketball", "world_football"].includes(a.category),
  );
}
