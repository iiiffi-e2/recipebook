"use client";

import { motion } from "framer-motion";
import { UserPlus, Crown, Edit, Eye } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoFamily, demoActivity } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";

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

export default function FamilyPage() {
  return (
    <>
      <Header
        title="Family Cookbook"
        subtitle="Shared with the Mitchell family — 4 members, 6 recipes"
      />

      <div className="mb-8">
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite Family Member
        </Button>
      </div>

      {/* Members */}
      <section className="mb-12">
        <h2 className="mb-6 font-serif text-2xl font-medium">Members</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {demoFamily.map((member, i) => {
            const RoleIcon = roleIcons[member.role];
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
          })}
        </div>
      </section>

      {/* Activity Feed */}
      <section>
        <h2 className="mb-6 font-serif text-2xl font-medium">Recent Activity</h2>
        <div className="space-y-3">
          {demoActivity.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4 rounded-xl bg-ivory p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cream font-medium text-sage">
                {activity.author.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-charcoal-muted">{activity.description}</p>
                <p className="mt-1 text-xs text-charcoal-muted">
                  {formatDate(activity.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
