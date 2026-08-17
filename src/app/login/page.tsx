"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 text-center">{t("appTitle")}</h1>
        {sent ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">{t("magicLinkSent")}</p>
        ) : (
          <>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              onClick={send}
              disabled={sending || !email}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {sending ? t("sending") : t("sendMagicLink")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
