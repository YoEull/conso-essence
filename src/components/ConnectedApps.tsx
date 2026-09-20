"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { getConnectedApps, revokeConnectedApp, type ConnectedApp } from "@/lib/data";

const MCP_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mcp`;

export function ConnectedApps() {
  const { t, lang } = useLanguage();
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const load = async () => {
    try {
      setApps(await getConnectedApps());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const revoke = async (clientId: string) => {
    setError(null);
    try {
      await revokeConnectedApp(clientId);
      setConfirming(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable on plain http; the URL stays selectable.
    }
  };

  const locale = lang === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">{t("connectedAppsDescription")}</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {apps === null && !error && <p className="text-sm text-gray-400 dark:text-gray-500">{t("loading")}</p>}
      {apps?.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t("noConnectedApps")}</p>}

      {apps?.map((app) => (
        <div key={app.clientId} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{app.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("connectedSince")} {new Date(app.grantedAt).toLocaleDateString(locale)}
              </p>
            </div>
            <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
              {t("connected")}
            </span>
          </div>
          {confirming === app.clientId ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-200">{t("confirmDisconnect")}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => revoke(app.clientId)}
                  className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg"
                >
                  {t("disconnect")}
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(app.clientId)}
              className="w-full py-2 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg border border-red-200 dark:border-red-900"
            >
              {t("disconnect")}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowHow((v) => !v)}
        className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
      >
        {t("connectAssistant")}
      </button>
      {showHow && (
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <p>{t("connectSteps")}</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={MCP_URL}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button onClick={copy} className="shrink-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
