import { View } from "react-native";

import { InfoRow, Pill, SectionCard } from "@/shared/components/ui";
import { formatDateTime } from "@/shared/utils/date";
import type { Profile } from "@project-agap/api/supabase";

type Props = {
  profile: Profile | null;
  barangayName?: string;
  municipality?: string;
};

export function ProfileAssignmentCard({ profile, barangayName, municipality }: Props) {
  return (
    <SectionCard
      title="Assignment"
      subtitle="Your role and barangay are used to scope map data, alerts, and status pings."
    >
      <View className="gap-2">
        <Pill label={(profile?.role ?? "resident").toUpperCase()} tone="info" />
        <InfoRow label="Barangay" value={barangayName ?? "Not assigned"} />
        <InfoRow label="Municipality" value={municipality ?? "Not assigned"} />
        <InfoRow label="Account created" value={formatDateTime(profile?.created_at)} />
      </View>
    </SectionCard>
  );
}
