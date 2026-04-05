import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppRole } from "@project-agap/api/supabase";

const WELCOME_SEEN_PREFIX = "agap-welcome-seen";

function getWelcomeSeenKey(userId: string, role: AppRole) {
  return `${WELCOME_SEEN_PREFIX}:${role}:${userId}`;
}

export async function hasSeenWelcome(userId: string, role: AppRole) {
  const value = await AsyncStorage.getItem(getWelcomeSeenKey(userId, role));
  return value === "1";
}

export async function markWelcomeSeen(userId: string, role: AppRole) {
  await AsyncStorage.setItem(getWelcomeSeenKey(userId, role), "1");
}

export async function getPostAuthRoute(userId: string, role: AppRole) {
  const seenWelcome = await hasSeenWelcome(userId, role);

  if (!seenWelcome) {
    return "/welcome";
  }

  return role === "official" ? "/(official)/dashboard" : "/(resident)/status";
}
