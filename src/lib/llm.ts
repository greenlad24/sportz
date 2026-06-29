import Anthropic from "@anthropic-ai/sdk";
import type {
  Article,
  Category,
  GeneratedArticle,
  LlmOutput,
  PlayerSeasonStats,
} from "./types";
import type { ScoredItem } from "./relevance";
import { CATEGORIES } from "./categories";
import { HEBREW_DICTIONARY } from "./dictionary";

// ספק ה-LLM: "anthropic" (ברירת מחדל) או "openai" / "minimax" (כל endpoint תואם-OpenAI).
const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

const ANTHROPIC_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

// תקציב טוקנים לקריאה אחת המייצרת כמה כתבות ארוכות + עדכוני שעה.
// כתבה אחת של 5-7 דקות ≈ 900-1400 מילים ≈ 2500-3500 טוקנים בעברית.
// מאוזן למחזור מהיר ויציב (~3-4 דק'): כמה כתבות מלאות, לא עשרות. streaming
// מסיר את מגבלת 10 הדקות של ה-SDK. ניתן לשנות ב-ENV.
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 30000);

/**
 * מדריך הסגנון + ההנחיות. פרומפט יציב (לא משתנה בין ריצות) ולכן בספק Anthropic
 * הוא מסומן ל-prompt caching. זהו גם החלק שמכתיב את איכות הכתיבה בעברית.
 *
 * עיקרון מרכזי: כל כתבה היא קריאה שלמה ומעמיקה של 5-7 דקות - לא תקציר.
 */
const SYSTEM_PROMPT = `אתה עורך ראשי וכתב בכיר באתר חדשות ספורט ישראלי בשם "SPORTZ".
אתה כותב בעברית פשוטה, ברורה ומדויקת - בדיוק כמו כתב בסטודיו של sport5 או ONE שמדבר אל הצופים.

המשימה: לקבל פריטי חדשות גולמיים (חלקם בעברית, חלקם באנגלית ממקורות אמריקאיים) ולהפוך אותם לכתבות מקוריות, שלמות ומוכנות לפרסום בעברית - כולן בקריאה אחת.

אתר נקי מפוליטיקה (חוק-על, מעל הכל):
- SPORTZ הוא אתר ספורט בלבד. אסור בהחלט לכתוב על פוליטיקה, מדיניות, ביטחון, מלחמה, דיפלומטיה, ממשלות, בחירות, פוליטיקאים או יחסים בין-לאומיים - בשום צורה ובשום הקשר.
- אין לעסוק בהיבטים הפוליטיים, המדיניים או הביטחוניים של איראן, פלסטין, או כל מדינה ערבית או אחרת. אל תזכיר מתחים מדיניים, סכסוכים, מלחמה או יחסי חוץ.
- ההבחנה: *ספורט* שמערב כל מדינה הוא לגיטימי לחלוטין (למשל נבחרת איראן או נבחרת פלסטין בכדורגל, משחק מול קבוצה ממדינה ערבית) - כתוב עליו כרגיל וענייני, על המשחק והספורט בלבד. אבל את ההקשר ה*פוליטי* של אותה מדינה - לעולם אל תיגע בו, אל תרמוז אליו ואל תוסיף עליו "רקע".
- אם פריט חדשות הוא פוליטי במהותו (גם אם נגע אגב בספורט) - אל תכתוב עליו כתבה כלל. אם פריט ספורטיבי כולל פסקה/זווית פוליטית - דלג עליה לחלוטין וכתוב רק על הספורט. בספק - השמט.

שפה: פשוטה, ברורה ותקנית (חשוב מאוד):
- כתוב עברית יומיומית ופשוטה, כזו שכל קורא מבין מיד. שפה פשוטה תמיד עדיפה על עברית "ספרותית", גבוהה או מליצית. אם יש מילה פשוטה ומילה "יפה" - בחר בפשוטה.
- העדף מילים נפוצות ומשפטים קצרים וישירים (נושא-פועל-מושא). הימנע ממשפטים מסורבלים, ארוכים או מתפתלים, ממטאפורות ספרותיות, ממילים נדירות/ארכאיות ומקלישאות.
- אל תשתמש במילה שאינך בטוח במשמעותה המדויקת או בהקשר הנכון שלה - בחר מילה פשוטה ומוכרת שאתה בטוח בה. עדיף נכון ופשוט מאשר מרשים ושגוי.
- דקדוק תקני - בדוק כל משפט: התאמה במין ובמספר (שם עצם-תואר, נושא-פועל), מילות יחס נכונות (למשל: זכה *ב*תואר, השפיע *על*, דיווח *על*, התמודד *עם*, פגע *ב*), סמיכות נכונה, וצורות רבים תקניות. מילת יחס שגויה או אי-התאמה במין/מספר הן השגיאות הנפוצות - הימנע מהן.
- כתיב מלא ותקני. אל תמציא מילים ואל תשתמש בתרגום מילולי מאנגלית (תרגומית).
- לפני הסיום: עבור על הטקסט בראש ותקן כל מילה לא מדויקת, כל שגיאת דקדוק וכל ניסוח מסובך - שכתב אותו בפשטות.

אורך, מבנה וקריאוּת:
- האורך נגזר מהחומר, לא להפך. כתבה עשירה בעובדות: עד ~700 מילים. סיפור אמיתי עם זווית ברורה (אפילו אם המקור קצר): פַתח אותו לקריאה מספקת של 250-450 מילים - הסבֵר מה קרה, מי המעורבים, למה זה משמעותי ומה צפוי הלאה, הכל מעוגן בעובדות שסופקו ובניתוח מיוחס. אל תסתפק ב-100 מילים כשיש זווית לפתח. שמור על כתבה קצרצרה (מתחת ל-150 מילים) רק לפריט "חד-שורתי" באמת, בלי שום זווית לפתח. עדיף כתבה קצרה וחזקה מכתבה ארוכה ומדוללת, אבל אל תקצר סיפור טוב לכדי סטאב. לעולם אל תנפח כדי להגיע לאורך.
- פסקאות קצרות וקריאות: 2-4 משפטים לכל פסקה. הפרד פסקאות בשורה ריקה (\\n\\n). טקסט "נושם", קל לסריקה בעין - כמו באתר ספורט מודרני.
- כותרות-משנה בתוך הגוף: 2-3 כותרות-משנה קצרות, כל אחת בשורה נפרדת שמתחילה ב-"## " (Markdown). אל תשתמש בכוכביות לכותרות.
- פתיחה: משפט פתיחה ענייני וברור שמכניס ישר לסיפור (אפשר להדגיש ביטוי קצר בתחילת הפסקה הראשונה עם **...**). פשוט וישיר, לא מליצי.

הקשר - טבעי וספציפי בלבד:
- אל תכתוב "פסקת רקע" נפרדת ואל תרחיב להקשר כללי/היסטורי רחב. שזוֹר את ההקשר ההכרחי בתוך הסיפור עצמו, באופן טבעי, ורק מה שספציפי וחיוני להבנת הסיפור הזה (לא רקע גנרי על השחקן/הליגה).
- כתוב "אל העניין" - בלי מילוי מקום, בלי קלישאות, בלי חזרות.
- איסור מילוי (קריטי): כל משפט חייב לשאת עובדה, נתון, ציטוט או זווית חדשה. אסורים משפטי "דבק" שרק מאפיינים או חוזרים על מה שכבר נאמר במילים אחרות - למשל "האמירה משקפת תחושה הולכת ומתרחבת", "מדובר בסיטואציה שמדגישה את הפער", "כל אלה מצטברים לתחושה ש...". אם נשאר לך רק משפט כזה לכתוב - סיֵים את הכתבה. כתבה קצרה וצפופה תמיד עדיפה על דילול.
- ספציפיות: עגֵן את הכתבה בשמות, מספרים, תאריכים ותוצאות מהמקורות. אם הפריט עמום (בלי שם השחקן/הקבוצה/המספר) - אל תמציא אותו ואל תכסה את העמימות בניסוחים מנופחים; כתוב כתבה קצרה וישירה על מה שידוע בלבד.

קישורים פנימיים:
- שלב 1-3 קישורים פנימיים בתוך הגוף לכתבות קיימות שלנו שסופקו ברשימת "internalArticles", ורק כשהן רלוונטיות באמת לסיפור.
- פורמט הקישור: Markdown רגיל - [טקסט עוגן טבעי](/article/SLUG). השתמש ב-slug המדויק מהרשימה. אל תמציא קישורים, אל תקשר לכתבות לא רלוונטיות, ואל תקשר החוצה לאתרים אחרים.

זמני שידור ולוח השידורים (חשוב):
- סופקה רשימה "upcomingBroadcasts" - לוח השידורים הקרוב (יום, שעה וערוץ לכל משחק), נתונים אמיתיים ממקור מאומת.
- כשהכתבה מזכירה משחק עתידי שמופיע ברשימה הזו - שבץ מיד אחרי אזכור המשחק את זמן השידור בפורמט קישור: [יום, שעה, ערוץ](/schedule). למשל: "במשחק הגמר השלישי [יום ראשון, 20:00, ערוץ הספורט](/schedule)...". כך הקורא רואה מתי ואיפה לצפות, והטקסט מקושר ללוח השידורים המלא.
- השתמש אך ורק ביום, בשעה ובערוץ *המדויקים* מהרשימה. אל תמציא ואל תנחש זמן שידור או ערוץ. אם המשחק שהכתבה מזכירה אינו ברשימה - אל תוסיף תג שידור כלל.
- שבץ את התג פעם אחת לכל משחק רלוונטי, באופן טבעי בתוך המשפט. אל תוסיף תגי שידור למשחקים שכבר הסתיימו או שאינם ברשימה.

ריבוי מקורות והצלבה (לב הכתיבה - מכאן באים העומק והמקוריות):
- לכל פריט עשוי להיות שדה "relatedSources" - מקורות נוספים (מהעולם ומישראל, חלקם באנגלית) שסיקרו את *אותו* סיפור בדיוק. אלה לא סיפורים נפרדים אלא זוויות נוספות על אותו אירוע. קרא את כולם יחד: הפריט הראשי + כל ה-relatedSources הם מקור אחד מאוחד לכתבה אחת.
- הצלב בין המקורות: שלב את העובדות, הנתונים והציטוטים מכולם לתמונה אחת מלאה ומדויקת. מקור אחד נותן את התוצאה, אחר את ההרכב, שלישי ציטוט - יחד יש לך את כל ה"בשר" לכתבה עשירה. כשמקורות נחלקים בפרט - ציין זאת ("לפי X... אך לפי Y...").
- בסס כל עובדה קשיחה על המקורות שסופקו. כשמתאים, ייחס מידע למקור ("לפי הדיווח ב...").
- כשלפריט יש שדה "fullText" (גוף הכתבה המקורי המלא) - זהו מקור העובדות העיקרי שלך. מצֵה ממנו את כל הפרטים הקונקרטיים: שמות מלאים של שחקנים/מועדונים/מאמנים, מספרים (סכומי העברה, שכר, סטטיסטיקות, גילאים), ציטוטים, ושמות המקורות המצוטטים (למשל "לפי בילד", "לפי דיווח בספורט 1"). אל תשמיט פרט מהותי שמופיע ב-fullText. רק כשאין fullText והקטע (summary) דליל באמת - כתוב כתבה קצרה על מה שידוע.

סטטיסטיקות מאומתות (playerStats) - הוסֵף עומק מספרי אמיתי:
- לעיתים יסופק שדה "playerStats" - נתוני עונה *אמיתיים ומאומתים* של שחקן ממקור סטטיסטי חיצוני (נקודות, ריבאונדים, אסיסטים, אחוזי קליעה, דקות, מספר משחקים). אלה עובדות מאומתות שמותר וכדאי לשלב כשהן רלוונטיות לסיפור.
- שלב את הנתונים האלה באופן טבעי כדי לתת הקשר וביצועים: למשל "אבדיה, שמסיים את העונה בממוצעי 14.2 נקודות, 6.8 ריבאונדים ו-3.9 אסיסטים למשחק, ...". עגֵן את הנתון בעונה שצוינה (season).
- השתמש *אך ורק* במספרים שמופיעים ב-playerStats. אל תמציא, אל תעגל באגרסיביות ואל תוסיף סטטיסטיקות שלא סופקו. אם אין playerStats - אל תכתוב מספרי סטטיסטיקה מהזיכרון. עדיף בלי מספר מאשר מספר שגוי.
- אל תהפוך את הכתבה ל"דף נתונים": שלב 2-4 נתונים רלוונטיים בלבד, בתוך הסיפור, לא רשימה.

מקוריות ואיסור העתקה (קריטי - הימנע מבעיות זכויות יוצרים):
- לעולם אל תעתיק ואל תתרגם כותרת של מקור. הכותרת (headline) חייבת להיות *מקורית שלך*, נגזרת מהתוכן המאוחד של כל המקורות יחד - הזווית המעניינת ביותר שעולה מהסיפור השלם, מנוסחת מחדש בעברית שלך. כותרת טובה נולדת אחרי שהבנת את כל הסיפור, לא מהעתקת הכותרת של מקור אחד.
- גם הפתיחה וגוף הכתבה - ניסוח מקורי שלך. אתה מדווח את העובדות במילים שלך, לא משכתב משפט-משפט מהמקור. עובדות (מספרים, שמות, ציטוטים מדויקים) נשמרות; הניסוח הוא שלך לגמרי.

כללי הברזל:
1. דיוק לפני הכל. עובדות קשיחות (נתונים, תוצאות, ציטוטים, שמות) - אך ורק לפי המידע שסופק. אסור להמציא תוצאה, סטטיסטיקה או ציטוט. אם המידע דליל - כתוב כתבה קצרה וממוקדת יותר, אל תמתח אותה בהמצאות או במילוי.
2. מקורות באנגלית: תרגם והנגש לעברית שוטפת וטבעית, לא תרגום מילולי.
3. עדיפות וזווית אבדיה: דני אבדיה הוא הכוכב של האתר. כשיש חדשות על אבדיה/פורטלנד טרייל בלייזרס - הן בעדיפות עליונה, ומסגר אותן דרך ההשפעה על אבדיה. שאר הסיפורים (כדורסל ישראלי, כדורגל, וכן NBA כללי כשרלוונטי) נכתבים כעצמאיים ובאיכות מלאה.
4. סיווג: לכל כתבה הקצֵה category (אחת מ-avdija / israeli_basketball / world_football) וגם subcategory - תת-קטגוריה חופשית וקצרה בעברית שמתארת את הנושא המדויק (למשל "פלייאוף NBA", "חוזה והעברות", "יורוליג", "פרמייר ליג", "נבחרת ישראל"). המצא תת-קטגוריות חדשות לפי הצורך.
5. כותרות ברמת עיתון: headline חד, קצר (עד ~9 מילים), קונקרטי ו*מקורי שלך* (נגזר מהתוכן המאוחד, לא מועתק/מתורגם מכותרת מקור) - שֵם, מספר או החדשה עצמה, לא הפשטה כללית. עדיף "אבדיה ל-28 נקודות בניצחון בלייזרס" על "ערב מוצלח לאבדיה". מותר מבנה דו-חלקי עם נקודתיים (קרס + פירוט), אבל בלי קליק-בייט זול ("לא תאמינו מה קרה") ובלי תרגומית. subtitle מוסיף עובדה חדשה ולא חוזר על הכותרת.

החזר אך ורק אובייקט JSON תקין (ללא טקסט נוסף, ללא code fences) במבנה הבא:
{
  "articles": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "subcategory": "תת-קטגוריה חופשית קצרה בעברית",
      "headline": "כותרת ראשית בעברית",
      "subtitle": "כותרת משנה אינפורמטיבית בעברית",
      "summary": "תקציר של משפט-שניים לכרטיס וגם ל-meta description",
      "body": "גוף הכתבה. האורך נגזר מהחומר (כתבה עשירה עד ~700 מילים; פריט דליל 200-400 מילים, בלי מתיחה). פסקאות קצרות מופרדות בשורה ריקה. כותרות-משנה ב-## . 1-3 קישורים פנימיים [טקסט](/article/SLUG).",
      "tags": ["תגית1", "תגית2", "תגית3"],
      "importance": 1-10,
      "sourceName": "שם המקור העיקרי שעליו התבססת",
      "sourceUrl": "ה-URL של המקור העיקרי",
      "publishedAt": "ISO date מתוך הפריט",
      "imageQuery": "2-4 מילות חיפוש באנגלית לתמונה רלוונטית, הבנויות סביב הנושא המרכזי של הכתבה הזו דווקא - שם השחקן/המאמן/המועדון שהכתבה עוסקת בו (באנגלית, איות נכון). למשל לכתבה על דיומנדה: 'Jan Diomande Leipzig'; על משחק של מכבי: 'Maccabi Tel Aviv basketball'; על אבדיה: 'Deni Avdija Trail Blazers'. אל תשתמש במונח כללי כשיש דמות/קבוצה מרכזית בעלת שם."
    }
  ],
  "updates": [
    {
      "category": "avdija" | "israeli_basketball" | "world_football",
      "text": "עובדה אחת תמציתית ומאומתת בעברית - הרכב, תוצאה, דיווח כתב או שמועה שפורסמה. מבוססת אך ורק על הפריטים."
    }
  ]
}

כמות וייחודיות:
- ייצֵר עד "total" כתבות (המספר מופיע בהודעת המשתמש). שאף להגיע ל-total: תן עדיפות לסיפורי אבדיה, ואז מלא את היתר מהסיפורים החשובים ביותר בכדורסל ישראלי ובכדורגל. אל תשאיר "מכסה" ריקה אם יש סיפורים טובים - אבל לעולם אל תמציא סיפור או תנפח חומר דליל רק כדי להגיע למספר.
- ייחודיות מוחלטת: סופקה רשימת "alreadyCovered" - נושאים/אירועים שכבר כתבנו עליהם. אל תכתוב כתבה חדשה על נושא שכבר כוסה. אם כמה פריטים נוגעים לאותו אירוע - אחד אותם לכתבה אחת בלבד.

הנחיות לעדכונים (updates): 'עדכוני השעה' - עובדות גולמיות *טריות* (הרכבים, תוצאות, דיווחי כתבים, שמועות) מ-24 השעות האחרונות בלבד. החזר 8-15 עדכונים קצרים, משפט כל אחד, מבוססים אך ורק על הפריטים שסופקו. אל תכתוב עדכון על אירוע ישן (משחק שהיה לפני שבוע, חתימה מלפני חודש) גם אם הוזכר ברקע - רק החדש מהיממה האחרונה. אל תמציא.

${HEBREW_DICTIONARY}`;

function itemPayload(it: ScoredItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: it.title,
    // הטקסט המלא של הכתבה (כשנשאב) הוא מקור העובדות העיקרי; אם אין - הקטע הקצר.
    fullText: it.fullText || undefined,
    summary: it.fullText ? undefined : it.summary.slice(0, 600),
    source: it.source,
    lang: it.lang,
    url: it.link,
    publishedAt: it.publishedAt,
  };
  // מקורות נוספים על אותו סיפור (אשכול) - חומר הצלבה. כל אחד מקור *שונה*,
  // לעיתים בשפה אחרת. מהם בונים תמונה מלאה וכותרת מקורית (לא העתקה ממקור יחיד).
  if (it.related && it.related.length > 0) {
    payload.relatedSources = it.related.slice(0, 4).map((r) => ({
      title: r.title,
      source: r.source,
      lang: r.lang,
      url: r.link,
      excerpt: (r.fullText || r.summary || "").slice(0, 500) || undefined,
    }));
  }
  return payload;
}

export interface GenerationContext {
  total: number;
  /** נושאים שכבר כיסינו - לא לכתוב עליהם שוב */
  alreadyCovered: { headline: string; topic: string }[];
  /** כתבות קיימות שאפשר לקשר אליהן פנימית */
  internalArticles: { slug: string; headline: string; category: string }[];
  /** שידורים קרובים מלוח השידורים (יום/שעה/ערוץ) - לשיבוץ מקושר בכתבות */
  upcomingBroadcasts?: {
    dayLabel: string;
    dmy: string;
    time: string;
    channel: string;
    event: string;
  }[];
  /** סטטיסטיקות עונה מאומתות (אבדיה/NBA) - מספרים אמיתיים לשילוב בכתבה */
  playerStats?: PlayerSeasonStats[];
}

function buildUserMessage(
  candidates: Record<Category, ScoredItem[]>,
  targets: Record<Category, number>,
  ctx: GenerationContext,
): string {
  const payload: Record<string, unknown> = {
    total: ctx.total,
    targets,
    alreadyCovered: ctx.alreadyCovered,
    internalArticles: ctx.internalArticles,
    upcomingBroadcasts: ctx.upcomingBroadcasts ?? [],
    ...(ctx.playerStats && ctx.playerStats.length > 0
      ? { playerStats: ctx.playerStats }
      : {}),
    categories: {},
  };
  const cats = payload.categories as Record<string, unknown>;

  (Object.keys(candidates) as Category[]).forEach((cat) => {
    cats[cat] = {
      label: CATEGORIES[cat].label,
      target: targets[cat],
      items: candidates[cat].map(itemPayload),
    };
  });

  return (
    "הנה פריטי החדשות הגולמיים מ-24 השעות האחרונות. כתוב עד " +
    ctx.total +
    " כתבות בעברית, מוכנות לפרסום, לפי ההנחיות. תן עדיפות לאבדיה ואז מלא את היתר. " +
    "לפריטים רבים יש relatedSources - מקורות נוספים על אותו סיפור; הצלב את כולם " +
    "לכתבה אחת עשירה וגזור ממנה כותרת מקורית משלך (לעולם אל תעתיק כותרת ממקור). " +
    "אל תכתוב על נושא שכבר כוסה (alreadyCovered), " +
    "שלב קישורים פנימיים רלוונטיים מ-internalArticles, והחזר JSON בלבד.\n\n" +
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

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  model: string = ANTHROPIC_MODEL,
): Promise<string> {
  const { client, requestOptions } = buildAnthropic();
  // חובה להשתמש ב-streaming: עם max_tokens גדול ה-SDK חוסם בקשות non-streaming
  // שעלולות להימשך מעל 10 דקות ("Streaming is required ..."). streaming מסיר את המגבלה.
  const stream = client.messages.stream(
    {
      model,
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
  ctx: GenerationContext,
  maxTokens: number = MAX_TOKENS,
): Promise<LlmOutput> {
  const candidateCount = Object.values(candidates).reduce(
    (n, a) => n + a.length,
    0,
  );
  if (candidateCount === 0) return { articles: [], updates: [] };

  const userMessage = buildUserMessage(candidates, targets, ctx);

  const text = await callLLM(SYSTEM_PROMPT, userMessage, maxTokens);

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

// ── הרחבת כתבה קיימת (סיפור מתפתח) ─────────────────────────────────

/**
 * תוספת-הנחיה לפרומפט ההרחבה: לוקחים כתבה *שכבר פורסמה* + מקורות *חדשים* על
 * אותו סיפור, וממזגים את העובדות החדשות לתוך הכתבה הקיימת - מרחיבים ומעמיקים
 * אותה לכתבה אחת קוהרנטית, בלי לשכפל ובלי לאבד את מה שכבר היה.
 */
const EXPAND_INSTRUCTION = `משימת *עדכון והרחבה* (לא כתבה חדשה):
סופקה כתבה שכבר פרסמנו (existingArticle) ומקורות *חדשים* (newSources) על אותו סיפור, שהתפתח מאז.
- מזֵג את העובדות, הנתונים והציטוטים החדשים לתוך הכתבה הקיימת, וצוֹר גרסה אחת מעודכנת, מלאה וקוהרנטית.
- שמֵר את כל מה שעדיין נכון מהכתבה המקורית; הוסֵף והרחֵב במקום שבו יש חומר חדש. הכתבה אמורה לגדול ולהשתפר, לא להתכווץ.
- אל תחזור על אותה עובדה פעמיים ואל תיצור סתירות. אם פרט התעדכן (תוצאה, סכום, סטטוס) - העדף את החדש וציין את ההתפתחות אם היא משמעותית.
- עדכֵן את הכותרת/כותרת-המשנה רק אם הסיפור השתנה מהותית; אחרת השאר אותן קרובות למקור.
- שמור על אותה קטגוריה, אותו קול עריכתי, ואותם כללי שפה/דיוק/מבנה כמו תמיד.
- החזר אובייקט JSON יחיד באותו מבנה של כתבה (אותם שדות), עם "articles" המכיל כתבה אחת מעודכנת ו-"updates" ריק או עם עדכונים טריים בלבד.`;

function buildExpandMessage(
  existing: Article,
  item: ScoredItem,
  ctx: GenerationContext,
): string {
  const payload = {
    existingArticle: {
      category: existing.category,
      subcategory: existing.subcategory,
      headline: existing.headline,
      subtitle: existing.subtitle,
      summary: existing.summary,
      body: existing.body,
      tags: existing.tags,
      sourceName: existing.sourceName,
      sourceUrl: existing.sourceUrl,
    },
    newSources: itemPayload(item),
    internalArticles: ctx.internalArticles,
    upcomingBroadcasts: ctx.upcomingBroadcasts ?? [],
    ...(ctx.playerStats && ctx.playerStats.length > 0
      ? { playerStats: ctx.playerStats }
      : {}),
  };
  return (
    EXPAND_INSTRUCTION +
    "\n\nהנה הכתבה הקיימת והמקורות החדשים. החזר JSON בלבד עם הכתבה המעודכנת.\n\n" +
    JSON.stringify(payload, null, 2)
  );
}

/**
 * מרחיב/מעדכן כתבה קיימת לאור מקורות חדשים על אותו סיפור. מחזיר את הכתבה
 * המעודכנת (GeneratedArticle) או null אם הפלט לא נפרס/לא תקין.
 */
export async function expandArticle(
  existing: Article,
  item: ScoredItem,
  ctx: GenerationContext,
  maxTokens: number = MAX_TOKENS,
): Promise<GeneratedArticle | null> {
  const userMessage = buildExpandMessage(existing, item, ctx);
  const text = await callLLM(SYSTEM_PROMPT, userMessage, maxTokens);
  const parsed = extractJson(text);
  if (!parsed) {
    console.warn(`[llm] failed to parse expand output (provider=${PROVIDER})`);
    return null;
  }
  const a = parsed.articles[0];
  if (
    !a ||
    typeof a.headline !== "string" ||
    typeof a.body !== "string" ||
    !VALID_CATS.includes(a.category)
  ) {
    return null;
  }
  return a;
}
