"use client";

import { useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";

type Item = { id: number; name: string };

export function ChipPicker({
  label,
  items,
  selectedId,
  onSelect,
  onAddNew,
  extraAction,
  rows = 1,
}: {
  label: string;
  items: Item[];
  selectedId: number | "";
  onSelect: (id: number | "") => void;
  onAddNew?: (name: string) => Promise<void>;
  extraAction?: { icon: ReactNode; onClick: () => void; loading?: boolean };
  rows?: 1 | 2;
}) {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const confirmAdd = async () => {
    if (!onAddNew) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onAddNew(trimmed);
      setName("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
        {onAddNew && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700"
          >
            +
          </button>
        )}
      </div>

      <div
        className={
          rows === 2
            ? "grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-1 -mx-4 px-4"
            : "flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        }
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(selectedId === item.id ? "" : item.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
              selectedId === item.id
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {adding && onAddNew && (
        <div className="flex gap-2 mt-2">
          {extraAction && (
            <button
              type="button"
              onClick={extraAction.onClick}
              disabled={extraAction.loading}
              className="shrink-0 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 disabled:opacity-50"
            >
              {extraAction.loading ? "…" : extraAction.icon}
            </button>
          )}
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={confirmAdd}
            disabled={saving}
            className="shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
            }}
            className="shrink-0 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
