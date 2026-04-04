"use client";

import { useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
    label: "Overview",
    icon: LayoutDashboard,
    section: "operations",
    statusKey: null,
  },
  {
    href: "/dashboard/live-status",
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

  const handleSignOut = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
    } catch (error) {
      console.error("Failed to sign out cleanly:", error);
    } finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }, [queryClient, router]);

  const hasLiveAlert = (summary?.need_help_count ?? 0) > 0;
  const hasSmsFollowup = (summary?.sms_replied_count ?? 0) > 0;
  const unaccountedCount = summary?.unaccounted_count ?? 0;
  const needHelpCount = summary?.need_help_count ?? 0;

  return (
    <div className="flex h-svh flex-col bg-muted/20">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="border-b border-sidebar-border p-5">
            <h2 className="text-lg font-semibold text-sidebar-foreground">
              Brgy. {barangay.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {barangay.municipality}
              {barangay.province ? `, ${barangay.province}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-sidebar-border p-3">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left dark:border-red-900/40 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">Need Help</p>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">{needHelpCount}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left dark:border-amber-900/40 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Unaccounted</p>
              <p className="text-xl font-semibold text-amber-800 dark:text-amber-300">{unaccountedCount}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-3">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    : undefined
                }
              />
            ))}

            <p className="mt-5 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                  pathname.startsWith(item.href + "/")
                }
                dotColor={
                  item.statusKey === "sms" && hasSmsFollowup
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
          <header className="flex shrink-0 border-b border-border bg-background">
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="default"
                  className="h-9 rounded-md px-3 text-sm"
                  nativeButton={false}
                  render={<Link href="/dashboard/broadcast" />}
                >
                  Send Broadcast
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="h-9 rounded-md px-3 text-sm"
                  nativeButton={false}
                  render={<Link href="/dashboard/needs-report" />}
                >
                  Needs Report
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Open account menu"
                      className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-1"
                    />
                  }
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="max-w-36 truncate">
                    {profile.full_name || user.email}
                  </span>
                  <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold">
                    Official
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    className="py-2 text-sm"
                    onSelect={() => {
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">{children}</main>

          {/* Footer strip */}
          <footer className="shrink-0 border-t border-border bg-muted/30 px-5 py-2">
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
      href={href as any}
      className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
          : "text-sidebar-foreground/90 hover:bg-sidebar-accent/60"
      }`}
    >
      {dotColor ? (
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
      ) : (
        <span className="h-2.5 w-2.5 shrink-0" />
      )}
      <Icon className="h-5 w-5 shrink-0" />
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
    <p className="text-sm text-muted-foreground" role="status">
      Last synced: {formatTimestamp(lastSync)}
    </p>
  );
}
