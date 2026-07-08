import type { Ingredient } from "@/lib/types";

function parseFraction(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }

  const fraction = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return parseInt(fraction[1], 10) / parseInt(fraction[2], 10);
  }

  const decimal = Number(trimmed);
  if (!Number.isNaN(decimal)) return decimal;

  return null;
}

function formatScaledAmount(value: number): string {
  if (value === 0) return "0";

  const whole = Math.floor(value);
  const remainder = value - whole;

  const commonFractions: [number, string][] = [
    [0.125, "1/8"],
    [0.25, "1/4"],
    [0.333, "1/3"],
    [0.375, "3/8"],
    [0.5, "1/2"],
    [0.625, "5/8"],
    [0.667, "2/3"],
    [0.75, "3/4"],
    [0.875, "7/8"],
  ];

  for (const [threshold, label] of commonFractions) {
    if (Math.abs(remainder - threshold) < 0.05) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  if (remainder < 0.05) return String(whole);

  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function scaleAmount(amount: string, factor: number): string {
  if (!amount.trim() || factor === 1) return amount;

  const rangeMatch = amount.trim().match(/^([\d./\s]+)\s*[-–]\s*([\d./\s]+)$/);
  if (rangeMatch) {
    const low = parseFraction(rangeMatch[1]);
    const high = parseFraction(rangeMatch[2]);
    if (low !== null && high !== null) {
      return `${formatScaledAmount(low * factor)}–${formatScaledAmount(high * factor)}`;
    }
  }

  const parsed = parseFraction(amount);
  if (parsed === null) return amount;

  return formatScaledAmount(parsed * factor);
}

export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): Ingredient[] {
  if (originalServings <= 0 || targetServings === originalServings) return ingredients;

  const factor = targetServings / originalServings;

  return ingredients.map((ingredient) => ({
    ...ingredient,
    amount: scaleAmount(ingredient.amount, factor),
  }));
}
