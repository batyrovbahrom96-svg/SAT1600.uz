"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const timeout = window.setTimeout(() => setVisible(true), 35);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return (
    <div
      className="page-transition"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.16s ease",
        willChange: "opacity"
      }}
    >
      {children}
    </div>
  );
}
