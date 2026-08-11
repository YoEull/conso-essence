"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Nouveau plein" },
  { href: "/historique", label: "Historique" },
  { href: "/parametres", label: "⚙️ Paramètres" },
];

export function AppHeader({ title, rightAction }: { title: string; rightAction?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          <nav className="relative bg-white w-64 max-w-[80vw] h-full shadow-xl p-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase px-3 mb-2">Suivi Essence</p>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-3 rounded-lg text-sm font-medium ${
                  pathname === link.href ? "bg-indigo-50 text-indigo-600" : "text-gray-700 active:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
