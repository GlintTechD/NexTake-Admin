import { createContext, useContext } from "react";
import type { AdminProfile } from "../../types";

export interface AuthContextValue {
  /**
   * The acting profile. There is no sign-in screen: a restored backend session
   * is used when one exists, otherwise the built-in local administrator.
   */
  profile: AdminProfile;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
