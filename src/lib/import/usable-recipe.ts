type RawIngredient = { name?: string; ingredient?: string } | string;
type RawInstruction = { text?: string; instruction?: string } | string;

function asList<T>(value: T[] | string | null | undefined): Array<T | string> {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

export function isUsableRecipe(raw: {
  ingredients?: RawIngredient[] | string;
  instructions?: RawInstruction[] | string;
}): boolean {
  const hasIngredient = asList(raw.ingredients).some((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    const name = String(item.name ?? item.ingredient ?? "").trim();
    return name.length > 0;
  });
  if (hasIngredient) return true;

  return asList(raw.instructions).some((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    const text = String(item.text ?? item.instruction ?? "").trim();
    return text.length > 0;
  });
}
