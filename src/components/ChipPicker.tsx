"use client";

import { useState } from "react";

type Item = { id: number; name: string };

export function ChipPicker({
  label,
  items,
  selectedId,
  onSelect,
  onAddNew,
  extraAction,
}: {
  label: string;
  items: Item[];
  selectedId: number | "";
  onSelect: (id: number) => void;
  onAddNew: (name: string) => Promise<void>;
  extraAction?: { label: string; onClick: () => void; loading?: boolean };
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const confirmAdd = async () => {
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

  // Selected item always leads the row, right after "+ Nouveau", so it's
  // never scrolled out of view once the list grows long.
  const selected = items.find((item) => item.id === selectedId);
  const rest = items.filter((item) => item.id !== selectedId);
  const orderedItems = selected ? [selected, ...rest] : items;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-2">{label}</label>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 sticky left-0 px-4 py-2.5 rounded-full text-sm font-medium border border-dashed border-gray-300 text-gray-500 bg-gray-50 active:bg-gray-100"
          >
            + Nouveau
          </button>
        )}
        {extraAction && (
          <button
            type="button"
            onClick={extraAction.onClick}
            disabled={extraAction.loading}
            className="shrink-0 whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-700 active:bg-gray-100 disabled:opacity-50"
          >
            {extraAction.loading ? "…" : extraAction.label}
          </button>
        )}
        {orderedItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
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
      {adding && (
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
        </div>
      )}
    </div>
  );
}
