"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

// Clients register themselves dynamically, so anyone can pick a
// convincing-looking name. The redirect host is what actually decides where
// the authorization code goes, so only known AI-client hosts are accepted.
const TRUSTED_REDIRECT_HOSTS = ["claude.ai", "claude.com", "chatgpt.com", "localhost", "127.0.0.1"];

function isTrustedRedirect(uri: string): boolean {
  try {
    const { protocol, hostname } = new URL(uri);
    if (protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1") return false;
    return TRUSTED_REDIRECT_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

type Details = { authorizationId: string; clientName: string; redirectUri: string };

function Consent() {
  const { t } = useLanguage();
  const authorizationId = useSearchParams().get("authorization_id");
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setError(t("consentMissingId"));
      return;
    }
    (async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error) return setError(error.message);
      if (!("authorization_id" in data)) {
        // Already consented earlier: Supabase hands back the final redirect.
        window.location.href = data.redirect_url;
        return;
      }
      setDetails({
        authorizationId: data.authorization_id,
        clientName: data.client.name,
        redirectUri: data.redirect_uri,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    if (!details) return;
    setBusy(true);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(details.authorizationId)
      : await supabase.auth.oauth.denyAuthorization(details.authorizationId);
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    window.location.href = data.redirect_url;
  };

  const trusted = details ? isTrustedRedirect(details.redirectUri) : false;
  const host = details ? new URL(details.redirectUri).host : "";

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 text-center">{t("consentTitle")}</h1>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && !details && <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t("loading")}</p>}
        {details && (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <span className="font-semibold">{details.clientName}</span> {t("consentWantsAccess")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("consentReturnsTo")} <span className="font-mono font-semibold">{host}</span>
            </p>
            {!trusted && <p className="text-sm text-red-600 dark:text-red-400">{t("consentUntrusted")}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => decide(false)}
                disabled={busy}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl disabled:opacity-50"
              >
                {t("consentDeny")}
              </button>
              {trusted && (
                <button
                  onClick={() => decide(true)}
                  disabled={busy}
                  className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {t("consentAllow")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <Consent />
    </Suspense>
  );
}
