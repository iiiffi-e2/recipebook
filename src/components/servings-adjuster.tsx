"use client";

import { Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServingsAdjusterProps {
  servings: number;
  originalServings: number;
  onChange: (servings: number) => void;
  className?: string;
  variant?: "card" | "inline";
}

export function ServingsAdjuster({
  servings,
  originalServings,
  onChange,
  className,
  variant = "card",
}: ServingsAdjusterProps) {
  const isScaled = servings !== originalServings;

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Users className="h-5 w-5 text-sage" />
        <span className="text-sm text-charcoal-muted">Serves</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(Math.max(1, servings - 1))}
            disabled={servings <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[2rem] text-center font-serif text-xl font-medium">
            {servings}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(servings + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {isScaled && (
          <button
            onClick={() => onChange(originalServings)}
            className="text-xs text-sage hover:underline"
          >
            Reset to {originalServings}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl bg-ivory p-5 text-center shadow-[var(--shadow-soft)]", className)}>
      <Users className="mx-auto mb-2 h-5 w-5 text-sage" />
      <p className="text-xs uppercase tracking-wider text-charcoal-muted">Serves</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(1, servings - 1))}
          disabled={servings <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <p className="min-w-[2rem] font-serif text-xl font-medium">{servings}</p>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(servings + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {isScaled && (
        <button
          onClick={() => onChange(originalServings)}
          className="mt-2 text-xs text-sage hover:underline"
        >
          Reset to {originalServings}
        </button>
      )}
    </div>
  );
}
