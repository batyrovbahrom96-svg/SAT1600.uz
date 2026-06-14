"use client";

import { useEffect } from "react";

export function DevOverlayCleaner() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const hideNextBadge = () => {
      document.querySelectorAll("nextjs-portal").forEach((portal) => {
        const root = portal.shadowRoot;
        if (!root) return;

        root.querySelectorAll<HTMLElement>("#devtools-indicator, [data-next-badge-root]").forEach((element) => {
          element.style.display = "none";
          element.style.pointerEvents = "none";
        });
      });
    };

    hideNextBadge();
    if (typeof window.MutationObserver === "undefined") return;
    const observer = new window.MutationObserver(hideNextBadge);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = window.setInterval(hideNextBadge, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
