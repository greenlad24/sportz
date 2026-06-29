// פורמט זמן יחסי בעברית ("לפני 5 דקות" וכו')

// אזור הזמן המקומי של האתר (ישראל). חשוב: השרת רץ ב-UTC, ובלי לקבוע אזור זמן
// מפורש כל הזמנים המוחלטים (שעה/תאריך) היו מוצגים ב-UTC - שעתיים/שלוש פחות
// מהשעון בישראל. קביעת Asia/Jerusalem מציגה את כל זמני הכתבות בשעון המקומי.
const TZ = "Asia/Jerusalem";

export function timeAgoHe(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return "עכשיו";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (minutes === 1) return "לפני דקה";
    if (minutes === 2) return "לפני שתי דקות";
    return `לפני ${minutes} דקות`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (hours === 1) return "לפני שעה";
    if (hours === 2) return "לפני שעתיים";
    return `לפני ${hours} שעות`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) return "אתמול";
  if (days === 2) return "שלשום";
  if (days < 7) return `לפני ${days} ימים`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "לפני שבוע";
  if (weeks < 5) return `לפני ${weeks} שבועות`;

  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(then);
}

/** "16:15 - 20.06.26" - זמן + תאריך קצר לשורות הכתבות */
export function formatShortHe(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const time = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(t);
  const date = new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: TZ,
  }).format(t);
  return `${time} - ${date}`;
}

export function formatDateHe(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(t);
}
