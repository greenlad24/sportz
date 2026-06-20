/**
 * הרצה ידנית של מנוע הניוז מהטרמינל (לפיתוח / בדיקה):
 *   npm run refresh
 *
 * טוען משתני סביבה מ-.env.local או .env אם קיימים.
 */
import { promises as fs } from "fs";
import path from "path";

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), file), "utf8");
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
        if (!(key in process.env)) process.env[key] = val;
      }
    } catch {
      // קובץ לא קיים - בסדר
    }
  }
}

async function main() {
  await loadEnv();
  const { runRefresh } = await import("../src/lib/engine");
  console.log("מריץ רענון...");
  const result = await runRefresh();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
