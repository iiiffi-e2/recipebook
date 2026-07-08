"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { demoRecipes } from "@/lib/demo-data";
import { getRecipeById } from "@/lib/demo-data";
import { formatDuration } from "@/lib/utils";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const mealTypes = ["breakfast", "lunch", "dinner", "dessert"] as const;

function getWeekDates(): { date: string; label: string; dayName: string }[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dayName: days[i],
    };
  });
}

export default function PlannerPage() {
  const { mealPlan, removeMealPlanEntry } = useAppStore();
  const weekDates = useMemo(() => getWeekDates(), []);

  return (
    <>
      <Header
        title="Meal Planner"
        subtitle="Plan your week with family favorites"
      />

      <div className="mb-8 flex items-center justify-between">
        <p className="text-charcoal-muted">
          Week of {weekDates[0].label} – {weekDates[6].label}
        </p>
        <Button variant="outline">
          <Plus className="h-4 w-4" />
          Generate Shopping List
        </Button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-8 gap-3 mb-3">
            <div />
            {weekDates.map((day) => (
              <div key={day.date} className="text-center">
                <p className="text-xs uppercase tracking-wider text-charcoal-muted">{day.dayName}</p>
                <p className="font-serif text-lg font-medium">{day.label}</p>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {mealTypes.map((mealType) => (
            <div key={mealType} className="grid grid-cols-8 gap-3 mb-3">
              <div className="flex items-center">
                <span className="text-sm font-medium capitalize text-charcoal-muted">
                  {mealType}
                </span>
              </div>
              {weekDates.map((day) => {
                const entries = mealPlan.filter(
                  (e) => e.date === day.date && e.mealType === mealType
                );
                return (
                  <div
                    key={`${day.date}-${mealType}`}
                    className="min-h-[100px] rounded-xl border border-dashed border-warm-gray bg-ivory/50 p-2"
                  >
                    {entries.map((entry) => {
                      const recipe = getRecipeById(entry.recipeId);
                      if (!recipe) return null;
                      return (
                        <motion.div
                          key={entry.id}
                          layout
                          className="group relative rounded-lg bg-ivory p-2 shadow-sm"
                        >
                          <button
                            onClick={() => removeMealPlanEntry(entry.id)}
                            className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-terracotta text-ivory group-hover:flex"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <Link href={`/app/recipes/${recipe.id}`}>
                            <div className="relative h-12 w-full overflow-hidden rounded-md mb-1">
                              <Image
                                src={recipe.heroImage}
                                alt={recipe.title}
                                fill
                                className="object-cover"
                                sizes="150px"
                              />
                            </div>
                            <p className="text-xs font-medium line-clamp-2">{recipe.title}</p>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Suggested recipes to add */}
      <section className="mt-12">
        <h2 className="mb-6 font-serif text-2xl font-medium">Add to Plan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demoRecipes.slice(0, 3).map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-center gap-4 rounded-2xl bg-ivory p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                <Image
                  src={recipe.heroImage}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{recipe.title}</p>
                <p className="text-xs text-charcoal-muted">
                  {formatDuration(recipe.prepTime + recipe.cookTime)}
                </p>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
