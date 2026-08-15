"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  const applyTheme = (value: "light" | "dark") => {
    setTheme(value);
    localStorage.setItem("theme", value);
    document.documentElement.classList.toggle("dark", value === "dark");
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => applyTheme("light")}
        className={`flex-1 py-3 rounded-xl text-sm font-medium border ${
          theme === "light"
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        }`}
      >
        ☀️ Clair
      </button>
      <button
        type="button"
        onClick={() => applyTheme("dark")}
        className={`flex-1 py-3 rounded-xl text-sm font-medium border ${
          theme === "dark"
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        }`}
      >
        🌙 Sombre
      </button>
    </div>
  );
}
