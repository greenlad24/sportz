import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <span className="rounded-md bg-brand px-3 py-1.5 text-2xl font-extrabold text-white">
        404
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-ink">
        העמוד לא נמצא
      </h1>
      <p className="mt-2 text-ink-muted">
        ייתכן שהכתבה הוסרה או שהקישור שגוי.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
      >
        חזרה לעמוד הראשי
      </Link>
    </div>
  );
}
