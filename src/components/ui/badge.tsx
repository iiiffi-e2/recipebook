import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "sage";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
        {
          "bg-terracotta-muted text-terracotta": variant === "default",
          "bg-sage-muted text-sage": variant === "sage",
          "bg-warm-gray text-charcoal-light": variant === "secondary",
          "border border-warm-gray text-charcoal-muted": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
