import { NextRequest, NextResponse } from "next/server";

interface HeroGenerateRequest {
  title: string;
  description?: string;
  category?: string;
  cuisine?: string;
  tags?: string[];
  cookingMethod?: string;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
}

const FALLBACK_IMAGES: Record<string, string> = {
  dessert:
    "https://images.unsplash.com/photo-1464300669046-5ef986c2f01c?w=1200&h=800&fit=crop",
  breakfast:
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&h=800&fit=crop",
  soup:
    "https://images.unsplash.com/photo-1598186229723-096598a9f46e?w=1200&h=800&fit=crop",
  dinner:
    "https://images.unsplash.com/photo-1595777216528-071e0127ccbf?w=1200&h=800&fit=crop",
  default:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop",
};

const PHOTO_STYLE_SUFFIX =
  "Professional cookbook hero photograph, 45-degree angle, warm natural window light, shallow depth of field, rustic ceramic or wooden surface, cream and sage tones, appetizing, no text, no people, no logos, no hands.";

function getFallbackImage(category?: string, tags?: string[]): string {
  const haystack = [category, ...(tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const key of Object.keys(FALLBACK_IMAGES)) {
    if (key !== "default" && haystack.includes(key)) {
      return FALLBACK_IMAGES[key];
    }
  }

  return FALLBACK_IMAGES.default;
}

function formatRecipeContext(recipe: HeroGenerateRequest): string {
  const lines = [
    `Recipe: ${recipe.title}`,
    recipe.description ? `Description: ${recipe.description}` : "",
    recipe.category ? `Category: ${recipe.category}` : "",
    recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : "",
    recipe.cookingMethod ? `Cooking method: ${recipe.cookingMethod}` : "",
    recipe.servings ? `Servings: ${recipe.servings}` : "",
    recipe.tags?.length ? `Tags: ${recipe.tags.join(", ")}` : "",
    recipe.ingredients?.length
      ? `Ingredients:\n${recipe.ingredients.map((i) => `- ${i}`).join("\n")}`
      : "",
    recipe.instructions?.length
      ? `Instructions:\n${recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
      : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function buildFallbackPrompt(recipe: HeroGenerateRequest): string {
  const ingredientHint = recipe.ingredients?.slice(0, 8).join(", ");
  const finalStep = recipe.instructions?.at(-1);

  return [
    "Cookbook-style presentation photograph of the finished dish.",
    `Dish: ${recipe.title}.`,
    recipe.description ? `About: ${recipe.description}` : "",
    recipe.cuisine ? `${recipe.cuisine} cuisine.` : "",
    ingredientHint ? `Visible ingredients: ${ingredientHint}.` : "",
    finalStep ? `Finished state: ${finalStep}` : "",
    PHOTO_STYLE_SUFFIX,
  ]
    .filter(Boolean)
    .join(" ");
}

async function buildPromptWithGpt(
  recipe: HeroGenerateRequest,
  openaiKey: string
): Promise<string | null> {
  const recipeContext = formatRecipeContext(recipe);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You write DALL-E image prompts for premium family cookbook photography.
Given a recipe, describe ONLY the finished, plated dish as it would appear in a cookbook hero shot.
Be specific about the food's appearance, colors, textures, doneness, garnishes, portion size, and serving vessel.
Infer visual details from the ingredients and instructions when needed.
Output a single paragraph prompt under 900 characters. No markdown, no quotes, no preamble.`,
        },
        {
          role: "user",
          content: `Create an image prompt for this recipe's finished dish:\n\n${recipeContext}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("GPT prompt generation failed:", response.status, errorBody);
    return null;
  }

  const data = await response.json();
  const generated = data.choices?.[0]?.message?.content?.trim();
  if (!generated) return null;

  return `${generated} ${PHOTO_STYLE_SUFFIX}`;
}

async function generateImageWithOpenAI(
  prompt: string,
  openaiKey: string
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1-mini",
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "medium",
      output_format: "webp",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Image generation failed:", response.status, errorBody);
    return null;
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (!b64) return null;

  return `data:image/webp;base64,${b64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HeroGenerateRequest;
    const { title, description, category, cuisine, tags, cookingMethod, servings, ingredients, instructions } =
      body;

    if (!title) {
      return NextResponse.json({ error: "Recipe title required" }, { status: 400 });
    }

    const recipe: HeroGenerateRequest = {
      title,
      description,
      category,
      cuisine,
      tags,
      cookingMethod,
      servings,
      ingredients,
      instructions,
    };

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      const prompt =
        (await buildPromptWithGpt(recipe, openaiKey)) ?? buildFallbackPrompt(recipe);
      const imageUrl = await generateImageWithOpenAI(prompt, openaiKey);

      if (imageUrl) {
        return NextResponse.json({
          success: true,
          imageUrl,
          source: "generated",
          prompt,
        });
      }
    }

    const fallbackPrompt = buildFallbackPrompt(recipe);

    return NextResponse.json({
      success: true,
      imageUrl: getFallbackImage(category, tags),
      source: "fallback",
      prompt: fallbackPrompt,
      message: openaiKey
        ? "AI image generation failed. Using a curated fallback image."
        : "Set OPENAI_API_KEY for AI-generated food photography.",
    });
  } catch (error) {
    console.error("Hero generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate hero image" },
      { status: 500 }
    );
  }
}
