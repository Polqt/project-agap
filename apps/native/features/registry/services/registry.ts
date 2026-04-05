import type { Household, HouseholdWithMembers } from "@project-agap/api/supabase";

import { trpcClient } from "@/services/trpc";

export async function listRegistryHouseholds(barangayId: string) {
  const response = await trpcClient.households.list.query({
    barangayId,
    page: 1,
    pageSize: 500,
  });
  return response.items as Household[];
}

export async function getRegistryHouseholdDetail(householdId: string, barangayId: string) {
  try {
    return (await trpcClient.households.getById.query({ id: householdId })) as HouseholdWithMembers;
  } catch {
    return null;
  }
}
