type RawIngredient = { name?: string; ingredient?: string };
type RawInstruction = { text?: string; instruction?: string } | string;

export function isUsableRecipe(raw: {
  ingredients?: RawIngredient[];
  instructions?: RawInstruction[];
}): boolean {
  const hasIngredient = (raw.ingredients ?? []).some((item) => {
    const name = String(item.name ?? item.ingredient ?? "").trim();
    return name.length > 0;
  });
  if (hasIngredient) return true;

  return (raw.instructions ?? []).some((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    const text = String(item.text ?? item.instruction ?? "").trim();
    return text.length > 0;
  });
}
