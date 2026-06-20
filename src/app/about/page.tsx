import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { CATEGORY_ORDER, CATEGORIES } from "@/lib/categories";

export const metadata: Metadata = {
  title: "אודות",
  description: `על ${SITE.name} - ${SITE.description}`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-extrabold text-ink">אודות {SITE.name}</h1>
      <div className="mt-4 space-y-4 text-lg leading-8 text-ink-soft">
        <p>
          <strong>{SITE.name}</strong> הוא אתר חדשות ספורט בעברית שמתעדכן
          אוטומטית כל 5 דקות. המנוע סורק מגוון מקורות בארץ ובארה&quot;ב, מאתר את
          הסיפורים הרלוונטיים והמיידיים ביותר, וכותב אותם בעברית עיתונאית.
        </p>
        <p>הדגש שלנו:</p>
        <ul className="list-inside list-disc space-y-2">
          {CATEGORY_ORDER.map((cat) => {
            const c = CATEGORIES[cat];
            return (
              <li key={cat}>
                <strong>{c.label}</strong> ({c.targetShare}%) - {c.description}
              </li>
            );
          })}
        </ul>
        <p>
          בכיסוי של פורטלנד טרייל בלייזרס, נקודת המבט שלנו תמיד אחת: איך זה משפיע
          על דני אבדיה.
        </p>
        <p className="text-sm text-ink-muted">
          הערה: הכתבות נכתבות באופן אוטומטי על בסיס מקורות חיצוניים. אנו שואפים
          לדיוק מרבי, אך מומלץ לאמת פרטים קריטיים מול המקור.
        </p>
      </div>
    </div>
  );
}
