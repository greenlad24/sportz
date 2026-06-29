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

/** הטמעת סרטון YouTube רספונסיבית (16:9) - מוצגת בתוך גוף הכתבה. */
function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="my-6 aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}

export function ArticleBody({
  body,
  videoId,
  videoTitle = "",
}: {
  body: string;
  /** אם קיים - הסרטון מוטמע *בתוך* הכתבה (אחרי פסקת הפתיחה) */
  videoId?: string;
  videoTitle?: string;
}) {
  const lines = body.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let para: string[] = [];
  let key = 0;
  let videoInserted = false;

  // משבצים את הסרטון אחרי פסקת הפתיחה (הראשונה) - כך הוא יושב באופן טבעי
  // בתוך זרם הקריאה, אחרי הליד ולפני המשך הכתבה.
  const maybeInsertVideo = () => {
    if (videoId && !videoInserted) {
      out.push(
        <VideoEmbed key={`v${key++}`} videoId={videoId} title={videoTitle} />,
      );
      videoInserted = true;
    }
  };

  const flushParagraph = () => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    if (text) {
      out.push(<p key={`k${key++}`}>{renderInline(text, `p${key}`)}</p>);
      maybeInsertVideo();
    }
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
  // אם לא הייתה פסקה להשתבץ אחריה - מטמיעים את הסרטון בסוף הכתבה.
  maybeInsertVideo();

  return <div className="article-body text-lg">{out}</div>;
}
