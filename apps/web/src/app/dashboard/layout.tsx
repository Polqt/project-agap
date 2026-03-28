import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { DashboardShell } from "@/app/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, barangay_id, full_name, phone_number")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "official") {
    redirect("/");
  }

  if (!profile.barangay_id) {
    redirect("/");
  }

  const { data: barangay } = await supabase
    .from("barangays")
    .select("id, name, municipality, province")
    .eq("id", profile.barangay_id)
    .single();

  return (
    <DashboardShell
      user={user}
      profile={profile}
      barangay={barangay ?? { name: "Barangay", municipality: "LGU" }}
    >
      {children}
    </DashboardShell>
  );
}
