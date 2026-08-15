"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

// Drag distance (as a fraction of screen width) needed to go from fully
// closed to fully open — always relative, never a hardcoded pixel value.
const OPEN_DRAG_FRACTION = 0.4;
const HORIZONTAL_INTENT_PX = 10;

function isInsideHorizontalScroller(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function AppHeader({ title, rightAction }: { title: string; rightAction?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV_LINKS = [
    { href: "/", icon: "💧", label: t("navNewFill") },
    { href: "/historique", icon: "🕓", label: t("navHistory") },
  ];
  const SETTINGS_LINK = { href: "/parametres", icon: "⚙️", label: t("navSettings") };

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    let phase: "idle" | "pending" | "dragging" = "idle";
    let startX = 0;
    let startY = 0;
    let startRatio = 0;
    let currentRatio = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (!openRef.current && isInsideHorizontalScroller(e.target)) {
        phase = "idle";
        return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startRatio = openRef.current ? 1 : 0;
      currentRatio = startRatio;
      phase = "pending";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (phase === "idle") return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (phase === "pending") {
        if (Math.abs(dx) < HORIZONTAL_INTENT_PX && Math.abs(dy) < HORIZONTAL_INTENT_PX) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          phase = "idle";
          return;
        }
        phase = "dragging";
      }

      const dragWidth = window.innerWidth * OPEN_DRAG_FRACTION;
      currentRatio = Math.min(1, Math.max(0, startRatio + dx / dragWidth));
      setDragRatio(currentRatio);
    };

    const onTouchEnd = () => {
      if (phase === "dragging") {
        setOpen(currentRatio >= 0.5);
      }
      phase = "idle";
      setDragRatio(null);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const ratio = dragRatio ?? (open ? 1 : 0);
  const isDragging = dragRatio !== null;

  const navChipClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-semibold ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-800"
    }`;

  return (
    <>
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label={t("menu")}
            className="p-2 -ml-2 rounded-lg text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-800"
          >
            ☰
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-gray-50">{title}</h1>
        </div>
        {rightAction}
      </header>

      <div
        className="fixed inset-0 z-30"
        style={{
          pointerEvents: ratio > 0 ? "auto" : "none",
          opacity: ratio,
          transition: isDragging ? "none" : "opacity 200ms",
        }}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
        <nav
          className="relative bg-white dark:bg-gray-900 w-64 max-w-[80vw] h-full shadow-xl p-4 flex flex-col"
          style={{
            transform: `translateX(${(ratio - 1) * 100}%)`,
            transition: isDragging ? "none" : "transform 200ms",
          }}
        >
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase px-1 mb-4">{t("appTitle")}</p>

          <div className="flex-1 flex flex-col justify-center gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={navChipClass(pathname === link.href)}
              >
                <span className="text-xl">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            href={SETTINGS_LINK.href}
            onClick={() => setOpen(false)}
            className={navChipClass(pathname === SETTINGS_LINK.href)}
          >
            <span className="text-xl">{SETTINGS_LINK.icon}</span>
            {SETTINGS_LINK.label}
          </Link>
        </nav>
      </div>
    </>
  );
}
