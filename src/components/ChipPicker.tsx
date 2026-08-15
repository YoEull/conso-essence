"use client";

import { useState, type ReactNode } from "react";

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
        <label className="text-sm font-medium text-gray-500">{label}</label>
        {onAddNew && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 active:bg-gray-100"
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
                : "bg-white border-gray-200 text-gray-700 active:bg-gray-100"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {adding && onAddNew && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-base"
          />
          <button
            type="button"
            onClick={confirmAdd}
            disabled={saving}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
            }}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg"
          >
            ✕
          </button>
          {extraAction && (
            <button
              type="button"
              onClick={extraAction.onClick}
              disabled={extraAction.loading}
              className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 active:bg-gray-100 disabled:opacity-50"
            >
              {extraAction.loading ? "…" : extraAction.icon}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
