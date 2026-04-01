"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthClient } from "@/lib/auth-client";

export default function UserMenu() {
  const { user, signOut, isLoading } = useAuthClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return <div className="h-7 w-24 animate-pulse rounded-full border border-border bg-muted" />;
  }

  if (!user) {
    return (
      <Button
        size="sm"
        onClick={() => router.push("/login")}
        className="rounded-full px-3"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-40 truncate text-xs text-muted-foreground lg:block">{user.email}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        className="rounded-full px-3"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign Out
      </Button>
    </div>
  );
}
