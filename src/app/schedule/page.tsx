import type { Metadata } from "next";
import type { Broadcast } from "@/lib/types";
import { getBroadcasts } from "@/lib/store";
import { SOURCE_NAME } from "@/lib/broadcasts";
import { SITE } from "@/lib/site";

// דינמי: מרונדר מהאחסון החי בכל בקשה, כך שהלוח המעודכן מופיע מיד.
export const dynamic = "force-dynamic";

const TITLE = "לוח שידורים";
const DESCRIPTION =
  "לוח שידורי הספורט בטלוויזיה: מתי ובאיזה ערוץ משודרים משחקי הכדורסל, הכדורגל והספורט הגדולים - דני אבדיה, מכבי והפועל, ליגת האלופות ועוד.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/schedule" },
  openGraph: {
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    url: "/schedule",
    type: "website",
  },
};

/** קיבוץ שידורי יום לפי ערוץ, תוך שמירת סדר ההופעה מהמקור. */
function groupByChannel(items: Broadcast[]): { channel: string; rows: Broadcast[] }[] {
  const groups: { channel: string; rows: Broadcast[] }[] = [];
  for (const it of items) {
    let g = groups.find((x) => x.channel === it.channel);
    if (!g) {
      g = { channel: it.channel, rows: [] };
      groups.push(g);
    }
    g.rows.push(it);
  }
  return groups;
}

export default async function SchedulePage() {
  const store = await getBroadcasts();
  const days = (store?.days ?? []).filter((d) => d.items.length > 0);

  return (
    <div className="mx-auto max-w-site px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink">{TITLE}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          {DESCRIPTION}
        </p>
        <p className="mt-1 text-xs text-ink-muted">מקור: {SOURCE_NAME}</p>
      </header>

      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-ink-muted">
          לוח השידורים יתעדכן בקרוב. חזרו עוד מעט.
        </p>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <section key={day.date}>
              <h2 className="mb-3 flex items-baseline gap-2 border-b-2 border-brand pb-1.5">
                <span className="text-lg font-extrabold text-ink">
                  {day.dayLabel}
                </span>
                <span className="text-sm text-ink-muted">{day.dmy}</span>
              </h2>

              <div className="space-y-5">
                {groupByChannel(day.items).map((g) => (
                  <div key={g.channel}>
                    <h3 className="mb-1.5 text-sm font-bold text-brand">
                      {g.channel}
                    </h3>
                    <ul className="overflow-hidden rounded-lg border border-line bg-white">
                      {g.rows.map((b, i) => (
                        <li
                          key={`${b.time}-${i}`}
                          className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0"
                        >
                          <span className="w-12 shrink-0 font-mono text-sm font-bold text-ink">
                            {b.time}
                          </span>
                          {b.isLive && (
                            <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              שידור חי
                            </span>
                          )}
                          <span className="text-sm leading-5 text-ink">
                            {b.event}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
