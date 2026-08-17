"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export function UserProfile() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const currentName = (session?.user.user_metadata?.display_name as string | undefined) ?? "";
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 dark:text-gray-500">{session?.user.email}</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder={t("displayNamePlaceholder")}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-0"
        />
        <button
          onClick={save}
          disabled={saving || name.trim() === currentName}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 shrink-0"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
      {saved && <p className="text-sm text-green-600 dark:text-green-400">{t("saved")}</p>}
    </div>
  );
}
