"use client";

import { useEffect, useState } from "react";

export function useChartTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return {
    isDark,
    grid: isDark ? "#334155" : "#e2e8f0",
    axis: isDark ? "#94a3b8" : "#64748b",
    tooltipStyle: {
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
      borderRadius: "8px",
      color: isDark ? "#f1f5f9" : "#0f172a",
    },
  };
}
