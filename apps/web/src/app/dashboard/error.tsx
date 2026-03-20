"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="text-xl font-semibold">Dashboard Error</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Failed to load dashboard data. Please try again."}
      </p>
      <Button onClick={reset} variant="outline">
        Retry
      </Button>
    </div>
  );
}
