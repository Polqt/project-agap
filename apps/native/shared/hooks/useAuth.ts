import type { AppRole, Profile } from "@project-agap/api/supabase";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type ResidentSignUpInput = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string | null;
  barangayId: string;
  purok: string;
};

export type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUpResident: (input: ResidentSignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
