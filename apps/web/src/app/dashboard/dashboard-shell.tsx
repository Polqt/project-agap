"use client";

import { useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bell,
  ClipboardList,
  FileText,
  LogOut,
  MessageSquare,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

type Profile = {
  id: string;
  role: string;
  barangay_id: string | null;
  full_name: string | null;
  phone_number: string | null;
};

type Barangay = {
  id?: string;
  name: string;
  municipality: string;
  province?: string;
};

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Live Status",
    icon: Activity,
    section: "operations",
    statusKey: "live" as const,
  },
  {
    href: "/dashboard/registry",
    label: "Household Registry",
    icon: ClipboardList,
    section: "operations",
    statusKey: null,
  },
  {
    href: "/dashboard/needs-report",
    label: "Needs Report",
    icon: FileText,
    section: "operations",
    statusKey: null,
  },
  {
    href: "/dashboard/broadcast",
    label: "Broadcast Alert",
    icon: Bell,
    section: "communication",
    statusKey: null,
  },
  {
    href: "/dashboard/sms",
    label: "SMS Monitor",
    icon: MessageSquare,
    section: "communication",
    statusKey: "sms" as const,
  },
] as const;

function formatTimestamp(date: Date) {
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardShell({
  user,
  profile,
  barangay,
  children,
}: {
  user: SupabaseUser;
  profile: Profile;
  barangay: Barangay;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const barangayId = profile.barangay_id ?? barangay.id ?? "";

  const { data: summary } = useQuery({
    ...trpc.dashboard.summary.queryOptions({ barangayId }),
    refetchInterval: 15000,
  });

  const { data: activeAlerts } = useQuery({
    ...trpc.alerts.listActive.queryOptions({ barangayId }),
    refetchInterval: 60000,
  });

  const handleSignOut = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }, [queryClient, router]);

  const hasLiveAlert = (summary?.need_help_count ?? 0) > 0;
  const hasSmsFollowup = (summary?.sms_replied_count ?? 0) > 0;

  const topAlert = activeAlerts?.[0];

  return (
    <div className="flex h-svh flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
          <div className="border-b border-sidebar-border p-4">
            <h2 className="font-semibold text-sidebar-foreground">
              Brgy. {barangay.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {barangay.municipality}
              {barangay.province ? `, ${barangay.province}` : ""}
            </p>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Operations
            </p>
            {NAV_ITEMS.filter((n) => n.section === "operations").map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
                }
                dotColor={
                  item.statusKey === "live" && hasLiveAlert
                    ? "bg-red-500"
                    : item.statusKey === "sms" && hasSmsFollowup
                      ? "bg-amber-500"
                      : undefined
                }
              />
            ))}

            <p className="mt-4 px-2 py-1 text-xs font-medium text-muted-foreground">
              Communication
            </p>
            {NAV_ITEMS.filter((n) => n.section === "communication").map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
                }
                dotColor={
                  item.statusKey === "live" && hasLiveAlert
                    ? "bg-red-500"
                    : item.statusKey === "sms" && hasSmsFollowup
                      ? "bg-amber-500"
                      : undefined
                }
              />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex shrink-0 flex-col border-b border-border bg-background">
            {/* Alert banner */}
            <div
              className={
                topAlert
                  ? "flex items-center gap-2 border-b border-border bg-amber-50 px-4 py-2 dark:bg-amber-950/30"
                  : "flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2"
              }
            >
              <AlertTriangle
                className={
                  topAlert ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-muted-foreground"
                }
              />
              {topAlert ? (
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium">
                    {topAlert.source.toUpperCase()} — {topAlert.signal_level ?? topAlert.severity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {topAlert.title} · {formatTimestamp(new Date(topAlert.issued_at))}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active alerts</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/broadcast" />}>
                  Send Broadcast
                </Button>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/needs-report" />}>
                  Needs Report
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" />}>
                  <UserIcon className="h-4 w-4" />
                  <span className="max-w-32 truncate">
                    {profile.full_name || user.email}
                  </span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs">
                    Official
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4">{children}</main>

          {/* Footer strip */}
          <footer className="shrink-0 border-t border-border bg-muted/30 px-4 py-1.5">
            <LastSynced />
          </footer>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  dotColor,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  dotColor?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
        isActive
          ? "border-l-2 border-primary bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      }`}
    >
      {dotColor ? (
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      ) : (
        <span className="h-2 w-2 shrink-0" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function LastSynced() {
  const healthCheck = useQuery({
    ...trpc.healthCheck.queryOptions(),
    refetchInterval: 30000,
  });

  const lastSync = healthCheck.dataUpdatedAt
    ? new Date(healthCheck.dataUpdatedAt)
    : new Date();

  return (
    <p className="text-xs text-muted-foreground" role="status">
      Last synced: {formatTimestamp(lastSync)}
    </p>
  );
}
