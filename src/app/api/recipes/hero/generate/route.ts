import { NextRequest, NextResponse } from "next/server";

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

function getFallbackImage(category?: string): string {
  const key = category?.toLowerCase() ?? "default";
  return FALLBACK_IMAGES[key] ?? FALLBACK_IMAGES.default;
}

function buildPrompt(body: {
  title: string;
  description?: string;
  category?: string;
  cuisine?: string;
  ingredients?: string[];
}): string {
  const ingredientHint = body.ingredients?.slice(0, 5).join(", ");
  return [
    "Editorial food photography for a premium family cookbook.",
    `Dish: ${body.title}.`,
    body.description ? `Context: ${body.description}` : "",
    body.cuisine ? `Cuisine: ${body.cuisine}.` : "",
    body.category ? `Category: ${body.category}.` : "",
    ingredientHint ? `Key ingredients: ${ingredientHint}.` : "",
    "Warm natural lighting, shallow depth of field, rustic ceramic plate,",
    "cream and sage color palette, appetizing, no text, no people, no logos.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, cuisine, ingredients } = body;

    if (!title) {
      return NextResponse.json({ error: "Recipe title required" }, { status: 400 });
    }

    const prompt = buildPrompt({ title, description, category, cuisine, ingredients });
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          style: "natural",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.data?.[0]?.url;
        if (imageUrl) {
          return NextResponse.json({
            success: true,
            imageUrl,
            source: "generated",
            prompt,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: getFallbackImage(category),
      source: "generated",
      prompt,
      message:
        "Using curated fallback image. Set OPENAI_API_KEY for AI-generated food photography.",
    });
  } catch (error) {
    console.error("Hero generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate hero image" },
      { status: 500 }
    );
  }
}
