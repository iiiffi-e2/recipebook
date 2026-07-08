"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface InviteInfo {
  familyName: string;
  email: string;
  role: string;
  valid: boolean;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [familyName, setFamilyName] = useState("My Family Cookbook");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;

    fetch(`/api/family/invite/lookup?token=${encodeURIComponent(inviteToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invite?.valid) {
          setInviteInfo(data.invite);
          setEmail(data.invite.email);
        }
      })
      .catch(() => undefined);
  }, [inviteToken]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: inviteToken
          ? `${window.location.origin}/auth/callback?invite=${inviteToken}`
          : `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      if (inviteToken) {
        const acceptRes = await fetch("/api/family/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken }),
        });

        if (!acceptRes.ok) {
          const acceptData = await acceptRes.json();
          setError(acceptData.error ?? "Failed to accept invite");
          setLoading(false);
          return;
        }
      } else {
        await fetch("/api/family", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ familyName }),
        });
      }

      router.push("/app");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  const joiningFamily = Boolean(inviteInfo?.valid);

  return (
    <div className="w-full max-w-md rounded-3xl bg-ivory p-8 shadow-[var(--shadow-soft)]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage/20">
          <ChefHat className="h-6 w-6 text-sage" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-medium text-charcoal">Create account</h1>
          <p className="text-sm text-charcoal-muted">
            {joiningFamily
              ? `Join ${inviteInfo?.familyName}`
              : "Start your family cookbook"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!joiningFamily && (
          <div>
            <label className="mb-2 block text-sm text-charcoal-muted" htmlFor="familyName">
              Family cookbook name
            </label>
            <Input
              id="familyName"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm text-charcoal-muted" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={joiningFamily}
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-charcoal-muted" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-terracotta">{error}</p>}
        {message && <p className="text-sm text-sage">{message}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Creating account..."
            : joiningFamily
              ? "Join family cookbook"
              : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal-muted">
        Already have an account?{" "}
        <Link
          href={inviteToken ? `/login?invite=${inviteToken}` : "/login"}
          className="text-terracotta hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-3xl bg-ivory" />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
