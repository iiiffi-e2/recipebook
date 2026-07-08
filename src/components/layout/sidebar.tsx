"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useFamilyInfo, useAllRecipes } from "@/lib/recipes";

const navigation = [
  { name: "Cookbook", href: "/app", icon: BookOpen },
  { name: "Import", href: "/app/import", icon: Upload },
  { name: "Assistant", href: "/app/assistant", icon: MessageCircle },
  { name: "Meal Planner", href: "/app/planner", icon: Calendar, demoOnly: true },
  { name: "Shopping", href: "/app/shopping", icon: ShoppingCart, demoOnly: true },
  { name: "Memories", href: "/app/memories", icon: Heart, demoOnly: true },
  { name: "Family", href: "/app/family", icon: Users },
] as const;

type NavItem = (typeof navigation)[number];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { family } = useFamilyInfo();
  const recipes = useAllRecipes();
  const configured = isSupabaseConfigured();
  const visibleNavigation = navigation.filter(
    (item) => !configured || !("demoOnly" in item && item.demoOnly)
  );
  const [open, setOpen] = useState(false);
  const closeDrawer = () => setOpen(false);

  // Prevent the page from scrolling behind the open drawer on mobile.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-warm-gray/60 bg-ivory/90 px-4 backdrop-blur-sm lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/20">
            <ChefHat className="h-5 w-5 text-sage" />
          </div>
          <span className="font-serif text-lg font-medium text-charcoal">Heirloom</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-charcoal transition-colors hover:bg-cream"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Backdrop (mobile only, when drawer is open) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-warm-gray/60 bg-ivory/95 backdrop-blur-sm transition-transform duration-300 ease-out lg:w-64 lg:translate-x-0 lg:bg-ivory/80",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 lg:h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20">
              <ChefHat className="h-5 w-5 text-sage" />
            </div>
            <div>
              <span className="font-serif text-xl font-medium text-charcoal">Heirloom</span>
              <p className="text-[10px] uppercase tracking-widest text-charcoal-muted">
                {family?.name ?? "Family Cookbook"}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-charcoal-muted transition-colors hover:bg-cream lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {visibleNavigation.map((item: NavItem) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeDrawer}
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
            onClick={closeDrawer}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-charcoal-muted transition-colors hover:bg-cream hover:text-charcoal"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>
          {configured && (
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-charcoal-muted transition-colors hover:bg-cream hover:text-charcoal"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          )}
          <div className="mt-3 rounded-xl bg-sage/10 p-4">
            <div className="flex items-center gap-2 text-sage">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">
                {configured ? "Supabase Connected" : "Demo Mode"}
              </span>
            </div>
            <p className="mt-1 text-xs text-charcoal-muted">
              {recipes.length} recipes in your cookbook
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
