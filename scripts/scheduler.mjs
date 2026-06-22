// מתזמן פנימי (מחליף Vercel Cron בדרופלט). שני מחזורים בלתי-תלויים:
//   - /api/plan  כל ~15 דק' : שאיבה -> אשכול -> טקסט מלא -> דה-דופ -> תור.
//   - /api/write כל ~2 דק'  : שולף אשכול אחד מהתור וכותב כתבה.
// כך יש זרם כתבות רציף (כתבה כל 2 דק'), כל אחת מקבוצת מקורות מאוחדת.
// הקריאה דרך ה-HTTP של ה-web מריצה את המנוע בתוך תהליך Next (עמודים דינמיים,
// כך שכתבות חדשות מופיעות מיד).

const BASE = process.env.INTERNAL_URL || "http://web:3000";
const SECRET = process.env.CRON_SECRET || "";
const PLAN_INTERVAL = Number(process.env.PLAN_INTERVAL_MS || 15 * 60 * 1000);
const WRITE_INTERVAL = Number(process.env.WRITE_INTERVAL_MS || 2 * 60 * 1000);

function endpoint(path) {
  const q = SECRET ? `?key=${encodeURIComponent(SECRET)}` : "";
  return `${BASE}${path}${q}`;
}

async function trigger(path) {
  try {
    const res = await fetch(endpoint(path), { method: "POST" });
    const body = await res.json().catch(() => ({}));
    console.log(
      new Date().toISOString(),
      `${path} -> ${res.status}`,
      JSON.stringify(body),
    );
  } catch (err) {
    console.error(new Date().toISOString(), `${path} failed:`, err.message);
  }
}

async function waitForWeb() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE, { method: "GET" });
      if (res.status < 500) return;
    } catch {
      // עדיין לא מוכן
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

(async () => {
  console.log(
    `[scheduler] base=${BASE} plan=${PLAN_INTERVAL}ms write=${WRITE_INTERVAL}ms secret=${SECRET ? "set" : "none"}`,
  );
  await waitForWeb();

  // תכנון ראשוני כדי למלא את התור, ואז התחלת מחזור הכתיבה אחרי דקה (לתת
  // לתכנון ולהעשרת הטקסט המלא זמן לסיים לפני הכתיבה הראשונה).
  await trigger("/api/plan");
  setInterval(() => trigger("/api/plan"), PLAN_INTERVAL);
  setTimeout(() => {
    trigger("/api/write");
    setInterval(() => trigger("/api/write"), WRITE_INTERVAL);
  }, 60 * 1000);
})();
