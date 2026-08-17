"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { FOREIGN_KEY_VIOLATION } from "@/lib/data";

type Item = { id: number; name: string; hidden?: boolean };

export function EditableNameList({
  items,
  onRename,
  onDelete,
  onToggleHidden,
}: {
  items: Item[];
  onRename: (id: number, name: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onToggleHidden?: (id: number, hidden: boolean) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const startEdit = (item: Item) => {
    setMenuOpenId(null);
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
      alert(t("genericError") + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleHidden = async (item: Item) => {
    setMenuOpenId(null);
    if (!onToggleHidden) return;
    try {
      await onToggleHidden(item.id, !item.hidden);
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(id);
      setConfirmingDeleteId(null);
    } catch (e) {
      const code = (e as { code?: string }).code;
      const message = code === FOREIGN_KEY_VIOLATION ? t("deleteBlockedFk") : (e as Error).message;
      setDeleteError({ id, message });
    } finally {
      setDeleting(false);
    }
  };

  const menuButtonClass =
    "w-full py-2.5 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700";

  const sorted = [...items].sort((a, b) => Number(!!a.hidden) - Number(!!b.hidden));

  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <div key={item.id} className="space-y-1">
          <div
            className={`flex items-center gap-2 border rounded-xl p-3 ${
              item.hidden
                ? "bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
            }`}
          >
            {editingId === item.id ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm"
                >
                  ✕
                </button>
              </>
            ) : confirmingDeleteId === item.id ? (
              <>
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">{t("confirmDeleteItem")}</span>
                <button
                  onClick={() => confirmDelete(item.id)}
                  disabled={deleting}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {t("deleteLabel")}
                </button>
                <button
                  onClick={() => setConfirmingDeleteId(null)}
                  disabled={deleting}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm"
                >
                  {t("cancel")}
                </button>
              </>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm ${
                    item.hidden ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {item.name}
                  {item.hidden && <span className="ml-2 text-xs italic">({t("hiddenBadge")})</span>}
                </span>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                  aria-label={item.name}
                  className="p-2 text-gray-400 dark:text-gray-500 active:bg-gray-100 dark:active:bg-gray-700 rounded-lg"
                >
                  ⋯
                </button>
              </>
            )}
          </div>

          {menuOpenId === item.id && (
            <div className="flex flex-col gap-1.5 p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
              <button onClick={() => startEdit(item)} className={menuButtonClass}>
                {t("editLabel")}
              </button>
              {onToggleHidden && (
                <button onClick={() => toggleHidden(item)} className={menuButtonClass}>
                  {item.hidden ? t("unhideLabel") : t("hideLabel")}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setMenuOpenId(null);
                    setConfirmingDeleteId(item.id);
                  }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 active:bg-red-100 dark:active:bg-red-900"
                >
                  {t("deleteLabel")}
                </button>
              )}
              <button onClick={() => setMenuOpenId(null)} className={menuButtonClass}>
                {t("cancel")}
              </button>
            </div>
          )}

          {deleteError?.id === item.id && (
            <p className="text-xs text-red-600 dark:text-red-400 px-1">{deleteError.message}</p>
          )}
        </div>
      ))}
    </div>
  );
}
