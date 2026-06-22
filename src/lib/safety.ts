// בטיחות תוכן: SPORTZ הוא אתר ידידותי-למשפחה (13+). מסננים תוכן מיני מפורש,
// גס או לא-הולם - גם במקור (לא כותבים עליו) וגם בפלט (לא מפרסמים אותו).
// שתי שכבות: (1) הנחיה לכותב במילון, (2) גייט קשיח בקוד כאן.

// שורשים בעברית של מילים מיניות/גסות מפורשות. ההתאמה מתחשבת בתחיליות
// (ה/ו/ב/ל/מ/ש...) ובסיומות, אך לא תופסת מילים לגיטימיות שמכילות את הרצף
// באמצע (למשל "מגזין" לא ייתפס ע"י "זין", "מין"=סוג/מגדר אינו ברשימה).
const HE_PREFIXES = [
  "", "ה", "ו", "ב", "כ", "ל", "מ", "ש",
  "וה", "שה", "וב", "ול", "ומ", "כש", "מה", "שכ", "וכ", "לכש",
];
const HE_ROOTS = [
  "סקס", // סקס, סקסי, הסקס
  "זיון", // זיון, זיונים
  "זיינ", // זיין, מזדיין (אחרי הסרת תחילית), להזדיין
  "מזדיינ",
  "פורנו",
  "אורגזמ",
  "שפיכ",
  "אוננ",
  "חרמן", // חרמן, חרמנית
  "זונה",
  "שרמוט",
];

function heHit(word: string): boolean {
  for (const p of HE_PREFIXES) {
    if (p && !word.startsWith(p)) continue;
    const stem = word.slice(p.length);
    for (const r of HE_ROOTS) if (stem.startsWith(r)) return true;
  }
  return false;
}

// אנגלית: התאמת מילה שלמה (גבולות מילה) כדי לא לתפוס "Essex"/"Sussex" וכו'.
const EN_RE =
  /\b(sex|sexual|sexually|porn\w*|orgasm\w*|masturbat\w*|blow\s?job|nud(?:e|ity)|erotic|incest|rape)\b/i;

/** האם הטקסט ידידותי-למשפחה (13+). false = מכיל תוכן מיני/גס מפורש. */
export function isFamilySafe(text: string): boolean {
  if (!text) return true;
  if (EN_RE.test(text)) return false;
  // פירוק למילים עבריות (רצפי אותיות) ובדיקה מול השורשים.
  const words = text.toLowerCase().match(/[\p{L}]+/gu) || [];
  for (const w of words) if (heHit(w)) return false;
  return true;
}
