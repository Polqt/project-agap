"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const ERROR_MESSAGES: Record<string, string> = {
  "auth-code-error": "Authentication failed. Please try again.",
  "no-code": "No authentication code received.",
};

function LoginContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? "An error occurred. Please try again." : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </div>
        )}
        {isSignUp ? (
          <SignUpForm onSwitchToSignIn={() => setIsSignUp(false)} />
        ) : (
          <SignInForm onSwitchToSignUp={() => setIsSignUp(true)} />
        )}
      </div>
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
