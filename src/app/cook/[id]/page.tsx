"use client";

import { use, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimerButton } from "@/components/cooking-timer";
import { ServingsAdjuster } from "@/components/servings-adjuster";
import { useRecipe } from "@/lib/recipes";
import { useAppStore } from "@/lib/store";
import { scaleIngredients } from "@/lib/scale-ingredients";

export default function CookingModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { recipe, loading } = useRecipe(id);
  const { checkedIngredients, toggleIngredient, startTimer, activeTimers } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [targetServings, setTargetServings] = useState<number | null>(null);

  const servings = targetServings ?? recipe?.servings ?? 4;
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return scaleIngredients(recipe.ingredients, recipe.servings, servings);
  }, [recipe, servings]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-terracotta border-t-transparent" />
      </div>
    );
  }

  if (!recipe) notFound();

  const checked = checkedIngredients[recipe.id] || [];
  const instruction = recipe.instructions[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === recipe.instructions.length - 1;
  const hasActiveTimer = activeTimers.some(
    (t) => t.recipeId === recipe.id && t.stepId === instruction?.id
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal cooking-mode">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 p-4 text-ivory">
        <Link href={`/app/recipes/${recipe.id}`} className="flex-shrink-0">
          <Button variant="ghost" size="icon" className="text-ivory hover:bg-ivory/10">
            <X className="h-6 w-6" />
          </Button>
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-sm text-ivory/60">Cooking</p>
          <p className="truncate font-serif text-lg font-medium">{recipe.title}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-ivory hover:bg-ivory/10"
          onClick={() => setShowIngredients(!showIngredients)}
        >
          Ingredients
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4">
        <div className="h-1 rounded-full bg-ivory/20">
          <div
            className="h-1 rounded-full bg-terracotta transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / recipe.instructions.length) * 100}%`,
            }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-ivory/60">
          Step {currentStep + 1} of {recipe.instructions.length}
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl text-center"
          >
            <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/20 font-serif text-3xl text-terracotta">
              {instruction.step}
            </span>
            <p className="text-2xl leading-relaxed text-ivory lg:text-3xl">
              {instruction.text}
            </p>

            {(instruction.timerMinutes ?? 0) > 0 && (
              <TimerButton
                minutes={instruction.timerMinutes}
                isActive={hasActiveTimer}
                onStart={() =>
                  startTimer(recipe.id, instruction.id, instruction.timerMinutes!)
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6">
        <Button
          variant="outline"
          size="lg"
          disabled={isFirst}
          onClick={() => setCurrentStep((s) => s - 1)}
          className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory/10"
        >
          <ChevronLeft className="h-6 w-6" />
          Previous
        </Button>
        {isLast ? (
          <Button size="lg" className="bg-sage hover:bg-sage-light">
            <Check className="h-5 w-5" />
            Done Cooking!
          </Button>
        ) : (
          <Button size="lg" onClick={() => setCurrentStep((s) => s + 1)}>
            Next Step
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Ingredients overlay */}
      <AnimatePresence>
        {showIngredients && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-ivory p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-2xl font-medium">Ingredients</h3>
              <div className="flex items-center gap-4">
                <ServingsAdjuster
                  servings={servings}
                  originalServings={recipe.servings}
                  onChange={setTargetServings}
                  variant="inline"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowIngredients(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {scaledIngredients.map((ingredient) => {
                const isChecked = checked.includes(ingredient.id);
                return (
                  <li
                    key={ingredient.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                    onClick={() => toggleIngredient(recipe.id, ingredient.id)}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                        isChecked ? "bg-sage border-sage text-ivory" : "border-sage-light"
                      }`}
                    >
                      {isChecked && <Check className="h-4 w-4" />}
                    </div>
                    <span className={isChecked ? "ingredient-checked text-lg" : "text-lg"}>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero image background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-10">
        <Image
          src={recipe.heroImage}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
    </div>
  );
}
