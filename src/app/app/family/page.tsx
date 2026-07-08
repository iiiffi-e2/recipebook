"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Crown, Edit, Eye, Copy, Check, X, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { demoFamily, demoActivity } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useFamilyInfo, useAllRecipes } from "@/lib/recipes";
import type { ActivityItem, FamilyMember } from "@/lib/types";

const roleIcons = {
  owner: Crown,
  editor: Edit,
  viewer: Eye,
};

const roleColors = {
  owner: "text-terracotta",
  editor: "text-sage",
  viewer: "text-charcoal-muted",
};

interface FamilyData {
  family: {
    familyId: string;
    name: string;
    slug: string;
    role: "owner" | "editor" | "viewer";
  } | null;
  members: FamilyMember[];
  activity: ActivityItem[];
  recipeCount: number;
}

function InviteModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("viewer");
      setError(null);
      setInviteUrl(null);
      setCopied(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/family/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to send invite");
      return;
    }

    setInviteUrl(data.inviteUrl);
    onInvited();
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium">Invite Family Member</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-charcoal-muted hover:bg-cream"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {inviteUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-charcoal-muted">
              Share this link with <span className="font-medium text-charcoal">{email}</span> so they
              can join your family cookbook.
            </p>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button type="button" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-charcoal-muted">
              The invite expires in 7 days. They must sign up with the invited email address.
            </p>
            <Button className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-charcoal-muted" htmlFor="invite-email">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="family.member@email.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-charcoal-muted" htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
                className="w-full rounded-xl border border-warm-gray bg-cream px-4 py-3 text-sm"
              >
                <option value="viewer">Viewer — can browse recipes</option>
                <option value="editor">Editor — can add and edit recipes</option>
              </select>
            </div>
            {error && <p className="text-sm text-terracotta">{error}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function MemberCard({ member, index }: { member: FamilyMember; index: number }) {
  const RoleIcon = roleIcons[member.role];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/20 font-serif text-xl text-sage">
        {member.name.charAt(0)}
      </div>
      <div className="flex-1">
        <p className="font-medium">{member.name}</p>
        <p className="text-sm text-charcoal-muted">{member.email}</p>
        <p className="mt-1 text-xs text-charcoal-muted">
          {member.recipesContributed} recipes contributed
        </p>
      </div>
      <Badge variant="outline" className="capitalize">
        <RoleIcon className={`mr-1 h-3 w-3 ${roleColors[member.role]}`} />
        {member.role}
      </Badge>
    </motion.div>
  );
}

export default function FamilyPage() {
  const configured = isSupabaseConfigured();
  const { family: contextFamily } = useFamilyInfo();
  const recipes = useAllRecipes();
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadFamily = useCallback(async () => {
    if (!configured) return;

    setLoading(true);
    setError(null);

    const response = await fetch("/api/family");
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Failed to load family");
      setLoading(false);
      return;
    }

    setData(payload);
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const members = configured ? (data?.members ?? []) : demoFamily;
  const activity = configured ? (data?.activity ?? []) : demoActivity;
  const familyName = configured
    ? (data?.family?.name ?? contextFamily?.name ?? "Family Cookbook")
    : "Mitchell family";
  const memberCount = members.length;
  const recipeCount = configured ? (data?.recipeCount ?? recipes.length) : recipes.length;
  const isOwner = configured && data?.family?.role === "owner";

  const subtitle = configured
    ? `${familyName} — ${memberCount} member${memberCount === 1 ? "" : "s"}, ${recipeCount} recipe${recipeCount === 1 ? "" : "s"}`
    : `Shared with the Mitchell family — 4 members, 6 recipes`;

  return (
    <>
      <Header title="Family Cookbook" subtitle={subtitle} />

      {configured && isOwner && (
        <div className="mb-8">
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite Family Member
          </Button>
        </div>
      )}

      {!configured && (
        <div className="mb-8 rounded-xl bg-sage/10 p-4 text-sm text-charcoal-muted">
          Connect Supabase to manage your real family members and send invites.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-charcoal-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading family...
        </div>
      )}

      {error && <p className="mb-6 text-sm text-terracotta">{error}</p>}

      <section className="mb-12">
        <h2 className="mb-6 font-serif text-2xl font-medium">Members</h2>
        {members.length === 0 && !loading ? (
          <p className="text-sm text-charcoal-muted">No family members yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {members.map((member, i) => (
              <MemberCard key={member.id} member={member} index={i} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-6 font-serif text-2xl font-medium">Recent Activity</h2>
        {activity.length === 0 && !loading ? (
          <p className="text-sm text-charcoal-muted">
            Activity will appear here as your family adds recipes and members join.
          </p>
        ) : (
          <div className="space-y-3">
            {activity.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 rounded-xl bg-ivory p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cream font-medium text-sage">
                  {item.author.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-charcoal-muted">{item.description}</p>
                  <p className="mt-1 text-xs text-charcoal-muted">{formatDate(item.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={loadFamily}
      />
    </>
  );
}
