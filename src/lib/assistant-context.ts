import type { Recipe } from "@/lib/types";
import { searchRecipes } from "@/lib/demo-data";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function formatRecipeForPrompt(recipe: Recipe): string {
  const totalTime = recipe.prepTime + recipe.cookTime;
  const tags = recipe.tags.length > 0 ? recipe.tags.join(", ") : "none";
  const familyMember = recipe.source.familyMember
    ? `, from ${recipe.source.familyMember}`
    : "";
  const ingredients = recipe.ingredients.map((i) => i.name).join(", ");
  const instructions = recipe.instructions
    .slice(0, 10)
    .map((step) => `${step.step}. ${step.text}`)
    .join("\n  ");
  const description = recipe.description
    ? `\n  Description: ${truncate(recipe.description, 200)}`
    : "";

  return `- ${recipe.title} (${recipe.category}, ${totalTime} min, tags: ${tags}${familyMember})
  Ingredients: ${ingredients || "not listed"}${description}
  Instructions:
  ${instructions || "not listed"}`;
}

export function buildAssistantSystemPrompt(
  recipes: Recipe[],
  familyName: string
): string {
  const cookbookContext =
    recipes.length > 0
      ? recipes.map(formatRecipeForPrompt).join("\n")
      : "No recipes have been added yet. Encourage the user to import recipes from the Import page.";

  return `You are the Heirloom cooking assistant — a warm, knowledgeable companion who knows the ${familyName} family cookbook intimately. You speak like a family member who grew up with these recipes.

Family cookbook context (${recipes.length} recipe${recipes.length === 1 ? "" : "s"}):
${cookbookContext}

Guidelines:
- Be warm, personal, and encouraging
- Reference specific family recipes from the cookbook above when relevant
- Only mention recipes that appear in the cookbook context — never invent or reference demo recipes
- Help with meal planning, substitutions, scaling, and cooking techniques
- Mention family memories and traditions when appropriate
- Keep responses concise but helpful
- Use markdown sparingly for lists
- If the cookbook is empty, help the user get started with importing recipes`;
}

export function buildAssistantFallbackResponse(
  message: string,
  recipes: Recipe[],
  familyName: string
): string {
  if (recipes.length === 0) {
    return `Your ${familyName} cookbook doesn't have any recipes yet. Head to the Import page to add your first family recipe, then I can help you plan meals, find substitutions, and more.`;
  }

  const matches = searchRecipes(message, recipes);

  if (matches.length > 0) {
    const list = matches
      .slice(0, 5)
      .map(
        (recipe) =>
          `• **${recipe.title}** (${recipe.category}, ${recipe.prepTime + recipe.cookTime} min${recipe.source.familyMember ? `, from ${recipe.source.familyMember}` : ""})`
      )
      .join("\n");

    return `Here are some recipes from your ${familyName} cookbook that might help:\n\n${list}\n\nAsk me to plan a meal, suggest substitutions, or scale a specific recipe for more detail.`;
  }

  return `I'd love to help with that! Your ${familyName} cookbook has ${recipes.length} recipe${recipes.length === 1 ? "" : "s"}. Try asking about specific ingredients, occasions, or a recipe title — for example, "What can I make with chicken?" or "Recipes under 30 minutes."`;
}
