"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", icon: "💧", label: "Nouveau plein" },
  { href: "/historique", icon: "🕓", label: "Historique" },
  { href: "/parametres", icon: "⚙️", label: "Paramètres" },
];

const SWIPE_THRESHOLD_PX = 50;

// Swiping inside a horizontally-scrollable chip row should scroll it,
// not open the drawer — walk up from the touch target to check.
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
  const pathname = usePathname();
  const touchStartX = useRef(0);

  // A left-to-right swipe starting anywhere on the page (outside horizontal
  // scrollers) opens the drawer, same as tapping the burger button.
  useEffect(() => {
    let tracking = false;
    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (open) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = !isInsideHorizontalScroller(e.target);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (dx > SWIPE_THRESHOLD_PX && Math.abs(dy) < 40) {
        setOpen(true);
        tracking = false;
      }
    };

    const onTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className="p-2 -ml-2 rounded-lg text-gray-700 active:bg-gray-100"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
        {rightAction}
      </header>

      {open && (
        <div className="fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <nav
            className="relative bg-white w-64 max-w-[80vw] h-full shadow-xl p-4 space-y-1"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (dx < -SWIPE_THRESHOLD_PX) setOpen(false);
            }}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Suivi Essence</p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  pathname === link.href ? "bg-indigo-50 text-indigo-600" : "text-gray-700 active:bg-gray-100"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
