// מתזמן פנימי: קורא ל-/api/refresh כל 5 דקות (מחליף את Vercel Cron בדרופלט).
// הקריאה דרך ה-HTTP של ה-web גורמת ל-Next להריץ את המנוע *וגם* לרענן את
// מטמון ה-ISR (revalidatePath) באותו תהליך - כך העמודים מתעדכנים מיידית.

const BASE = process.env.INTERNAL_URL || "http://web:3000";
const SECRET = process.env.CRON_SECRET || "";
const INTERVAL = Number(process.env.REFRESH_INTERVAL_MS || 5 * 60 * 1000);

function endpoint() {
  const q = SECRET ? `?key=${encodeURIComponent(SECRET)}` : "";
  return `${BASE}/api/refresh${q}`;
}

async function trigger() {
  try {
    const res = await fetch(endpoint(), { method: "POST" });
    const body = await res.json().catch(() => ({}));
    console.log(
      new Date().toISOString(),
      `refresh -> ${res.status}`,
      JSON.stringify(body),
    );
  } catch (err) {
    console.error(new Date().toISOString(), "refresh failed:", err.message);
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
    `[scheduler] base=${BASE} interval=${INTERVAL}ms secret=${SECRET ? "set" : "none"}`,
  );
  await waitForWeb();
  await trigger();
  setInterval(trigger, INTERVAL);
})();
