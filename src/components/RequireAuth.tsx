"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session && pathname !== "/login") {
      // Keep the current URL (e.g. an OAuth consent request) so login can return to it.
      const target = window.location.pathname + window.location.search;
      router.replace(pathname === "/" ? "/login" : `/login?redirect=${encodeURIComponent(target)}`);
    }
  }, [loading, session, pathname, router]);

  if (pathname === "/login") return <>{children}</>;
  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      </div>
    );
  }
  if (loading || !session) return null;
  return <>{children}</>;
}
