"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    setNow(
      new Intl.DateTimeFormat("he-IL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    );
  }, []);
  return <span className="hidden text-xs text-ink-muted sm:inline">{now}</span>;
}
