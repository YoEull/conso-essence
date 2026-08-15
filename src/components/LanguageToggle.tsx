"use client";

import { useLanguage } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`flex-1 py-3 rounded-xl text-sm font-medium border ${
          lang === "fr"
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        }`}
      >
        🇫🇷 Français
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`flex-1 py-3 rounded-xl text-sm font-medium border ${
          lang === "en"
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
        }`}
      >
        🇬🇧 English
      </button>
    </div>
  );
}
