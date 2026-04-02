import type { Household, HouseholdWithMembers } from "@project-agap/api/supabase";

import { supabase } from "@/services/supabase";

const householdBaseSelect =
  "id, barangay_id, registered_by, household_head, purok, address, phone_number, total_members, vulnerability_flags, is_sms_only, evacuation_status, notes, welfare_assigned_profile_id, welfare_assigned_at, created_at, updated_at";

export async function listRegistryHouseholds(barangayId: string) {
  const { data, error } = await supabase
    .from("households")
    .select(householdBaseSelect)
    .eq("barangay_id", barangayId)
    .order("household_head", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Household[];
}

export async function getRegistryHouseholdDetail(householdId: string, barangayId: string) {
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select(householdBaseSelect)
    .eq("id", householdId)
    .eq("barangay_id", barangayId)
    .maybeSingle();

  if (householdError) {
    throw new Error(householdError.message);
  }

  if (!household) {
    return null;
  }

  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select("id, household_id, full_name, age, vulnerability_flags, notes, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  return {
    ...household,
    household_members: members ?? [],
  } satisfies HouseholdWithMembers;
}
