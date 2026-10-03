import { useEffect, useMemo, useState, type ReactNode } from "react";
import { backend } from "../backend";
import { BRAND } from "../config";
import { AuthContext, type AuthContextValue } from "./context";
import type { AdminProfile } from "../../types";

/**
 * The console opens straight into the dashboard — there is no sign-in page.
 *
 * Every screen acts as this local administrator unless the auth backend
 * already holds a session (e.g. one restored from a previous visit), in which
 * case that profile is used instead.
 */
const LOCAL_ADMIN_PROFILE: AdminProfile = {
  id: "local-admin",
  email: BRAND.contactEmail,
  fullName: "Administrator",
  role: "admin",
  avatarUrl: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionProfile, setSessionProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    void backend.auth
      .getProfile()
      .then((existing) => {
        if (!cancelled) setSessionProfile(existing);
      })
      .catch(() => undefined);

    const unsubscribe = backend.auth.onChange((next) => {
      if (!cancelled) setSessionProfile(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ profile: sessionProfile ?? LOCAL_ADMIN_PROFILE }),
    [sessionProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
