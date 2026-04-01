"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Github, KeyRound, Mail, UserRound } from "lucide-react";

import { useAuthClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUpWithEmail, signInWithOAuth } = useAuthClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    const { error } = await signUpWithEmail(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
            We've sent you a confirmation link. Please check your email to complete registration.
        </p>
        <Button variant="link" onClick={onSwitchToSignIn} className="h-auto py-0.5 text-xs">
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Official Onboarding</p>
        <h2 className="text-xl font-semibold">Create your account</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Register to access dashboards, status updates, and emergency coordination tools.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="h-10 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-xs">Password</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-10 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs">Confirm Password</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-10 pl-8 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="h-10 w-full justify-between px-3 text-sm">
          {isLoading ? "Creating account..." : "Create Account"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthSignIn("github")}
          disabled={isLoading}
          className="h-10 text-sm"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading}
          className="h-10 text-sm"
        >
          Google
        </Button>
      </div>

        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="h-auto w-full py-1 text-xs"
        >
          Already have an account? Sign In
        </Button>
    </div>
  );
}
