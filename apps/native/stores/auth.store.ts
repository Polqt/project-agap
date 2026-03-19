import type { ContextProfile } from "@project-agap/api/supabase";
import { Store } from "@tanstack/store";
import type { Session } from "@supabase/supabase-js";

export type AuthStoreState = {
  session: Session | null;
  profile: ContextProfile | null;
  isLoading: boolean;
};

export const authStore = new Store<AuthStoreState>({
  session: null,
  profile: null,
  isLoading: true,
});
