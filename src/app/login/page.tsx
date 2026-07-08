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
  valid: boolean;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState(searchParams.get("error"));
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

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

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
      await fetch("/api/family", { method: "POST" });
    }

    router.push(next);
    router.refresh();
  }

  const joiningFamily = Boolean(inviteInfo?.valid);

  return (
    <div className="w-full max-w-md rounded-3xl bg-ivory p-8 shadow-[var(--shadow-soft)]">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage/20">
          <ChefHat className="h-6 w-6 text-sage" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-medium text-charcoal">Sign in</h1>
          <p className="text-sm text-charcoal-muted">
            {joiningFamily
              ? `Join ${inviteInfo?.familyName}`
              : "Access your family cookbook"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-terracotta">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : joiningFamily ? "Join family cookbook" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal-muted">
        New here?{" "}
        <Link
          href={inviteToken ? `/signup?invite=${inviteToken}` : "/signup"}
          className="text-terracotta hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-3xl bg-ivory" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
