"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { RadioTower } from "lucide-react";

import { useAuthClient } from "@/lib/auth-client";
import SignInForm from "@/components/sign-in-form";

const ERROR_MESSAGES: Record<string, string> = {
  "auth-code-error": "Authentication failed. Please try again.",
  "no-code": "No authentication code received.",
};

function LoginContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthClient();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? "An error occurred. Please try again." : null;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-border/70 bg-background/95 p-6 shadow-xl shadow-black/5 backdrop-blur md:p-7">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <RadioTower className="h-3.5 w-3.5" />
          Barangay Workers Portal
        </span>

        <h1 className="text-xl font-semibold">Project AGAP Sign In</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Authorized barangay workers only.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="mt-5">
          <SignInForm />
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
