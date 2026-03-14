"use client";

import { useEffect } from "react";

/**
 * When the user scrolls back near the top of the page, remove the hash from the URL
 * so the address bar shows e.g. "/" instead of "/#recent".
 */
const SCROLL_TOP_THRESHOLD = 80;

export default function ScrollHashSync() {
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined" || !window.location.hash) return;
      if (window.scrollY <= SCROLL_TOP_THRESHOLD) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
