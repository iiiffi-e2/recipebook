"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  ChefHat,
  Heart,
  Timer,
  BookOpen,
  MessageCircle,
  History,
  ArrowLeft,
  Play,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeHero } from "@/components/recipe-hero";
import { useRecipe } from "@/lib/recipes";
import { useAppStore } from "@/lib/store";
import { formatDuration, formatDate } from "@/lib/utils";

export default function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const recipe = useRecipe(id);
  const { checkedIngredients, toggleIngredient, startTimer, activeTimers } = useAppStore();
  const [activeStep, setActiveStep] = useState(0);

  if (!recipe) notFound();

  const checked = checkedIngredients[recipe.id] || [];
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <div className="max-w-5xl">
      <Link
        href="/app"
        className="mb-6 inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-charcoal transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cookbook
      </Link>

      {/* Hero */}
      <RecipeHero recipe={recipe}>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="sage">{recipe.category}</Badge>
          {recipe.cuisine && <Badge variant="outline">{recipe.cuisine}</Badge>}
          <Badge variant="secondary">{recipe.difficulty}</Badge>
        </div>
        <h1 className="font-serif text-4xl font-medium text-ivory lg:text-5xl">
          {recipe.title}
        </h1>
        {recipe.source.familyMember && (
          <p className="mt-2 flex items-center gap-2 text-ivory/80">
            <Users className="h-4 w-4" />
            From {recipe.source.familyMember}
          </p>
        )}
      </RecipeHero>

      {/* Actions */}
      <div className="mb-10 flex flex-wrap gap-3">
        <Link href={`/cook/${recipe.id}`}>
          <Button size="lg">
            <Play className="h-5 w-5" />
            Start Cooking
          </Button>
        </Link>
        <Button variant="outline" size="lg">
          <Heart className="h-5 w-5" />
          {recipe.isFavorite ? "Favorited" : "Add to Favorites"}
        </Button>
        <Link href="/app/assistant">
          <Button variant="outline" size="lg">
            <MessageCircle className="h-5 w-5" />
            Ask AI
          </Button>
        </Link>
      </div>

      {/* Meta */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Clock, label: "Prep", value: formatDuration(recipe.prepTime) },
          { icon: ChefHat, label: "Cook", value: formatDuration(recipe.cookTime) },
          { icon: Timer, label: "Total", value: formatDuration(totalTime) },
          { icon: Users, label: "Serves", value: String(recipe.servings) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-ivory p-5 text-center shadow-[var(--shadow-soft)]">
            <item.icon className="mx-auto mb-2 h-5 w-5 text-sage" />
            <p className="text-xs uppercase tracking-wider text-charcoal-muted">{item.label}</p>
            <p className="font-serif text-xl font-medium">{item.value}</p>
          </div>
        ))}
      </div>

      {recipe.description && (
        <p className="mb-10 text-lg leading-relaxed text-charcoal-muted italic">
          {recipe.description}
        </p>
      )}

      <Tabs defaultValue="recipe" className="mb-12">
        <TabsList>
          <TabsTrigger value="recipe">Recipe</TabsTrigger>
          <TabsTrigger value="memories">Memories ({recipe.memories.length})</TabsTrigger>
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="recipe">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Ingredients */}
            <div className="lg:col-span-2">
              <h2 className="mb-6 font-serif text-2xl font-medium">Ingredients</h2>
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient) => {
                  const isChecked = checked.includes(ingredient.id);
                  return (
                    <li
                      key={ingredient.id}
                      className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${isChecked ? "bg-sage/10" : "hover:bg-ivory"}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleIngredient(recipe.id, ingredient.id)}
                        className="mt-0.5"
                      />
                      <span className={isChecked ? "ingredient-checked" : ""}>
                        <span className="font-medium">
                          {ingredient.amount} {ingredient.unit}
                        </span>{" "}
                        {ingredient.name}
                        {ingredient.notes && (
                          <span className="text-charcoal-muted"> ({ingredient.notes})</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Instructions */}
            <div className="lg:col-span-3">
              <h2 className="mb-6 font-serif text-2xl font-medium">Instructions</h2>
              <ol className="space-y-6">
                {recipe.instructions.map((instruction, i) => {
                  const hasActiveTimer = activeTimers.some(
                    (t) => t.recipeId === recipe.id && t.stepId === instruction.id
                  );
                  return (
                    <motion.li
                      key={instruction.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl p-5 ${activeStep === i ? "bg-ivory shadow-[var(--shadow-soft)] border-l-4 border-terracotta" : ""}`}
                      onClick={() => setActiveStep(i)}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage/20 font-serif text-sm font-medium text-sage">
                          {instruction.step}
                        </span>
                        <div className="flex-1">
                          <p className="leading-relaxed">{instruction.text}</p>
                          {instruction.timerMinutes && (
                            <Button
                              variant={hasActiveTimer ? "default" : "outline"}
                              size="sm"
                              className="mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                startTimer(recipe.id, instruction.id, instruction.timerMinutes!);
                              }}
                            >
                              <Timer className="h-4 w-4" />
                              {instruction.timerMinutes} min timer
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="memories">
          <div className="space-y-6">
            {recipe.memories.length > 0 ? (
              recipe.memories.map((memory) => (
                <div key={memory.id} className="rounded-2xl bg-ivory p-6 shadow-[var(--shadow-soft)]">
                  <div className="mb-3 flex items-center gap-3">
                    {memory.type === "voice" ? (
                      <Mic className="h-5 w-5 text-terracotta" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-sage" />
                    )}
                    <div>
                      <p className="font-medium">{memory.title || "Memory"}</p>
                      <p className="text-xs text-charcoal-muted">
                        {memory.author} · {formatDate(memory.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="leading-relaxed text-charcoal-muted">{memory.content}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-charcoal-muted py-12">
                No memories yet. Add stories to preserve this recipe&apos;s history.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="original">
          {recipe.originals.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {recipe.originals.map((original) => (
                <div key={original.id} className="rounded-2xl overflow-hidden bg-ivory shadow-[var(--shadow-soft)]">
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={original.url}
                      alt="Original recipe"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-charcoal-muted">
                      Original {original.type} · Imported {formatDate(original.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-charcoal-muted py-12">No original uploads preserved.</p>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {recipe.timeline.map((event) => (
              <div key={event.id} className="flex gap-4 rounded-xl bg-ivory p-4">
                <History className="h-5 w-5 text-sage flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{event.title}</p>
                  {event.description && (
                    <p className="text-sm text-charcoal-muted">{event.description}</p>
                  )}
                  <p className="mt-1 text-xs text-charcoal-muted">
                    {formatDate(event.timestamp)}
                    {event.author && ` · ${event.author}`}
                  </p>
                </div>
              </div>
            ))}
            {recipe.cookingHistory.map((entry) => (
              <div key={entry.id} className="flex gap-4 rounded-xl bg-ivory p-4">
                <ChefHat className="h-5 w-5 text-terracotta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Cooked by {entry.cookedBy}</p>
                  {entry.notes && <p className="text-sm text-charcoal-muted">{entry.notes}</p>}
                  <p className="mt-1 text-xs text-charcoal-muted">
                    {formatDate(entry.cookedAt)}
                    {entry.rating && ` · ${"★".repeat(entry.rating)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {recipe.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag.replace(/-/g, " ")}
          </Badge>
        ))}
      </div>
    </div>
  );
}
