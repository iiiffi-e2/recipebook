"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Upload,
  MessageCircle,
  Calendar,
  ShoppingCart,
  Heart,
  Users,
  Home,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Cookbook", href: "/app", icon: BookOpen },
  { name: "Import", href: "/app/import", icon: Upload },
  { name: "Assistant", href: "/app/assistant", icon: MessageCircle },
  { name: "Meal Planner", href: "/app/planner", icon: Calendar },
  { name: "Shopping", href: "/app/shopping", icon: ShoppingCart },
  { name: "Memories", href: "/app/memories", icon: Heart },
  { name: "Family", href: "/app/family", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-warm-gray/60 bg-ivory/80 backdrop-blur-sm">
      <div className="flex h-20 items-center gap-3 px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20">
            <ChefHat className="h-5 w-5 text-sage" />
          </div>
          <div>
            <span className="font-serif text-xl font-medium text-charcoal">Heirloom</span>
            <p className="text-[10px] uppercase tracking-widest text-charcoal-muted">Mitchell Family</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sage/15 text-sage"
                  : "text-charcoal-muted hover:bg-cream hover:text-charcoal"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-warm-gray/60 p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-charcoal-muted transition-colors hover:bg-cream hover:text-charcoal"
        >
          <Home className="h-5 w-5" />
          Back to Home
        </Link>
        <div className="mt-3 rounded-xl bg-sage/10 p-4">
          <div className="flex items-center gap-2 text-sage">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">AI-Powered</span>
          </div>
          <p className="mt-1 text-xs text-charcoal-muted">
            6 recipes preserved · 4 family members
          </p>
        </div>
      </div>
    </aside>
  );
}
