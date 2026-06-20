"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CategoryChip } from "./CategoryChip";
import type { Category } from "@/lib/types";

interface SlimArticle {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  category: Category;
  publishedAt: string;
}
interface Results {
  articles: SlimArticle[];
  tags: string[];
  categories: { label: string; slug: string }[];
}
const EMPTY: Results = { articles: [], tags: [], categories: [] };

type Item =
  | { type: "category" | "tag"; href: string; label: string }
  | { type: "article"; href: string; label: string; article: SlimArticle };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter(Boolean).map(escapeRe);
  if (words.length === 0) return <>{text}</>;
  const re = new RegExp(`(${words.join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-brand/15 px-0.5 text-inherit">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const SearchIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
  </svg>
);

export function SearchBox() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Results>(EMPTY);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const r = JSON.parse(localStorage.getItem("sportz:recent") || "[]");
      if (Array.isArray(r)) setRecent(r);
    } catch {
      /* ignore */
    }
  }, []);

  // קיצורי מקלדת גלובליים: Ctrl/⌘+K או "/" לפתיחה
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (
        e.key === "/" &&
        !/(input|textarea)/i.test(
          (e.target as HTMLElement)?.tagName || "",
        )
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQ("");
      setData(EMPTY);
      setActive(-1);
    }
  }, [open]);

  // debounce + שליפת תוצאות
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) {
      setData(EMPTY);
      setActive(-1);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const j = await res.json();
        setData({
          articles: j.articles || [],
          tags: j.tags || [],
          categories: j.categories || [],
        });
        setActive(-1);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(id);
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: Item[] = [
    ...data.categories.map(
      (c): Item => ({
        type: "category",
        href: `/category/${c.slug}`,
        label: c.label,
      }),
    ),
    ...data.tags.map(
      (t): Item => ({
        type: "tag",
        href: `/search?q=${encodeURIComponent(t)}`,
        label: t,
      }),
    ),
    ...data.articles.map(
      (a): Item => ({
        type: "article",
        href: `/article/${a.slug}`,
        label: a.headline,
        article: a,
      }),
    ),
  ];

  const saveRecent = useCallback(
    (term: string) => {
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
      setRecent(next);
      try {
        localStorage.setItem("sportz:recent", JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [recent],
  );

  const go = useCallback(
    (href: string, term: string) => {
      if (term) saveRecent(term);
      setOpen(false);
      router.push(href);
    },
    [router, saveRecent],
  );

  const submit = useCallback(() => {
    const term = q.trim();
    if (!term) return;
    go(`/search?q=${encodeURIComponent(term)}`, term);
  }, [q, go]);

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = active >= 0 ? items[active] : undefined;
      if (it) go(it.href, q.trim() || it.label);
      else submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="חיפוש"
      className="flex shrink-0 items-center gap-1.5 px-3 text-sm font-semibold text-ink-muted hover:text-brand"
    >
      <SearchIcon />
      <span className="hidden sm:inline">חיפוש</span>
    </button>
  );

  const overlay =
    open &&
    createPortal(
      <div className="fixed inset-0 z-[100] bg-ink/40 px-4 pt-[12vh]">
        <div
          ref={panelRef}
          className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-line bg-white shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-line px-4 text-ink-muted">
            <SearchIcon className="h-5 w-5" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="חיפוש כתבות, נושאים, תגיות..."
              className="w-full bg-transparent py-3.5 text-base text-ink outline-none placeholder:text-ink-muted"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-line px-1.5 py-0.5 text-[11px] font-bold text-ink-muted hover:text-ink"
            >
              ESC
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!q.trim() ? (
              recent.length > 0 ? (
                <div>
                  <div className="px-2 py-1 text-xs font-bold text-ink-muted">
                    חיפושים אחרונים
                  </div>
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQ(r)}
                      className="block w-full rounded px-2 py-2 text-right text-sm text-ink hover:bg-paper-soft"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-6 text-center text-sm text-ink-muted">
                  חפשו כתבות, נושאים ותגיות. טיפ: Ctrl/⌘+K לפתיחה מהירה.
                </div>
              )
            ) : items.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-ink-muted">
                לא נמצאו תוצאות עבור &quot;{q}&quot;.
              </div>
            ) : (
              <ul>
                {items.map((it, idx) => (
                  <li key={it.type + idx}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(it.href, q.trim() || it.label)}
                      className={`flex w-full items-start gap-2 rounded px-2 py-2 text-right ${
                        active === idx ? "bg-paper-soft" : ""
                      }`}
                    >
                      {it.type === "article" ? (
                        <span className="min-w-0 flex-1">
                          <span className="mb-1 block">
                            <CategoryChip
                              category={it.article.category}
                              asLink={false}
                            />
                          </span>
                          <span className="block truncate text-sm font-bold text-ink">
                            <Highlight text={it.label} q={q} />
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {it.article.summary}
                          </span>
                        </span>
                      ) : it.type === "tag" ? (
                        <span className="text-sm text-ink-soft">
                          #<Highlight text={it.label} q={q} />{" "}
                          <span className="text-xs text-ink-muted">— נושא</span>
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-ink">
                          <Highlight text={it.label} q={q} />{" "}
                          <span className="text-xs text-ink-muted">
                            — קטגוריה
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={submit}
                    className="mt-1 block w-full rounded px-2 py-2 text-right text-sm font-bold text-brand hover:bg-paper-soft"
                  >
                    הצג את כל התוצאות עבור &quot;{q}&quot; ←
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {trigger}
      {mounted && overlay}
    </>
  );
}
