"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  groupId: number | null;
  loading: boolean;
  error: string | null;
  refreshGroupId: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// A user can belong to several groups; the app has no "switch group" UI yet
// (deliberately, to stay simple), so new vehicles/stations are created in
// the first non-hidden group the user joined. Everything the user can
// already see (via RLS) still shows the union of all their groups.
async function resolvePrimaryGroupId(session: Session): Promise<number> {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", session.user.id)
    .eq("status", "accepted")
    .eq("hidden", false)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.group_id;

  const emailName = session.user.email?.split("@")[0] ?? "Groupe";
  const { data: newId, error: rpcError } = await supabase.rpc("create_group", {
    group_name: `Groupe de ${emailName}`,
  });
  if (rpcError) throw rpcError;
  return newId as number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const applySession = async (newSession: Session | null) => {
      if (!active) return;
      setSession(newSession);
      if (!newSession) {
        setGroupId(null);
        return;
      }
      try {
        const id = await resolvePrimaryGroupId(newSession);
        if (active) {
          setGroupId(id);
          setError(null);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to resolve group for session:", e);
        if (active) setError((e as Error).message ?? String(e));
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Re-resolves the primary group after it may have changed (a group was
  // created, deleted, or left) — otherwise the cached id from login could
  // point at a group that no longer exists.
  const refreshGroupId = async () => {
    if (!session) return;
    try {
      const id = await resolvePrimaryGroupId(session);
      setGroupId(id);
      setError(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to refresh group for session:", e);
      setError((e as Error).message ?? String(e));
    }
  };

  return (
    <AuthContext.Provider value={{ session, groupId, loading, error, refreshGroupId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
