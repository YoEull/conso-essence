"use client";

import { useState } from "react";

type Item = { id: number; name: string };

export function EditableNameList({
  items,
  onRename,
}: {
  items: Item[];
  onRename: (id: number, name: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setDraft(item.name);
  };

  const save = async (id: number) => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onRename(id, trimmed);
      setEditingId(null);
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-3">
          {editingId === item.id ? (
            <>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={() => save(item.id)}
                disabled={saving}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                ✓
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-900">{item.name}</span>
              <button
                onClick={() => startEdit(item)}
                aria-label={`Modifier ${item.name}`}
                className="p-2 text-gray-400 active:bg-gray-100 rounded-lg"
              >
                ✎
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
