import React from "react";

// מרנדר גוף כתבה עם Markdown בסיסי:
//  - שורה שמתחילה ב-"## " / "### " -> כותרת משנה (h2/h3)
//  - שורה שכולה **טקסט** (פורמט ישן) -> כותרת משנה h2
//  - **טקסט** בתוך פסקה -> הדגשה (strong)
//  - שורה ריקה מפרידה פסקאות

// תומך ב-**הדגשה** וב-[טקסט](/article/slug) קישור פנימי
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const internal = href.startsWith("/");
      // תג זמן שידור (קישור ללוח השידורים) - מוצג כצ'יפ בולט עם אייקון
      const isBroadcast = href === "/schedule";
      nodes.push(
        <a
          key={`${keyPrefix}-a${i++}`}
          href={href}
          className={
            isBroadcast
              ? "mx-0.5 inline-flex items-center gap-1 rounded bg-paper-soft px-1.5 py-0.5 text-[0.85em] font-bold text-brand align-baseline hover:bg-brand hover:text-white"
              : "font-medium text-brand hover:underline"
          }
          {...(internal
            ? {}
            : { target: "_blank", rel: "noopener noreferrer nofollow" })}
        >
          {isBroadcast ? `📺 ${m[2]}` : m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ArticleBody({ body }: { body: string }) {
  const lines = body.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    if (text) out.push(<p key={`k${key++}`}>{renderInline(text, `p${key}`)}</p>);
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const text = heading[2].replace(/\*\*/g, "").trim();
      if (heading[1].length === 2) {
        out.push(<h2 key={`k${key++}`}>{text}</h2>);
      } else {
        out.push(<h3 key={`k${key++}`}>{text}</h3>);
      }
      continue;
    }

    // פורמט ישן: שורה שכולה **כותרת**
    const boldHeading = line.match(/^\*\*([^*]+?)\*\*:?$/);
    if (boldHeading) {
      flushParagraph();
      out.push(<h2 key={`k${key++}`}>{boldHeading[1].trim()}</h2>);
      continue;
    }

    para.push(line);
  }
  flushParagraph();

  return <div className="article-body text-lg">{out}</div>;
}
