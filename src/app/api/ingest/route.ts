import { NextRequest, NextResponse } from "next/server";

const OPENAI_TIMEOUT_MS = 90_000;

async function callOpenAI(body: Record<string, unknown>) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI ingest error:", response.status, errorBody);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("OpenAI ingest request failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRecipeContent(content?: string) {
  if (!content) return null;

  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
  } catch {
    return null;
  }
}

function buildFallbackRecipe(file: File | null, text: string | null) {
  const title =
    file?.name?.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") ||
    text?.split("\n")[0]?.trim() ||
    "Imported Recipe";

  return {
    title,
    description: "Imported locally. AI extraction was unavailable for this upload.",
    ingredients: [],
    instructions: [],
    prepTime: 0,
    cookTime: 0,
    servings: 4,
    difficulty: "medium",
    category: "Imported",
    tags: ["imported"],
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    if (!file && !text) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (file?.type === "application/pdf") {
      return NextResponse.json(
        {
          error:
            "PDF import is not supported yet. Try a photo or screenshot of the recipe, or paste the text instead.",
        },
        { status: 422 }
      );
    }

    if (openaiKey && file) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type || "image/jpeg";

      const data = await callOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a recipe extraction expert. Extract recipe information from the provided content and return a JSON object with these fields:
              title, description, ingredients (array of {amount, unit, name, notes}), instructions (array of {step, text, timerMinutes}),
              prepTime (minutes), cookTime (minutes), servings, difficulty (easy/medium/hard), cuisine, category, tags (array),
              cookingMethod, source. Clean formatting, remove ads and irrelevant text. Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: file.type.startsWith("image/")
              ? [
                  {
                    type: "text",
                    text: "Extract the recipe from this image. Return JSON only.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: `data:${mimeType};base64,${base64}` },
                  },
                ]
              : `Extract the recipe from this text:\n\n${await file.text()}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = data?.choices?.[0]?.message?.content;
      const recipe = parseRecipeContent(content);
      if (recipe) {
        return NextResponse.json({
          success: true,
          recipe,
          recipeId: `imported-${Date.now()}`,
        });
      }
    }

    if (openaiKey && text) {
      const data = await callOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Extract recipe information and return JSON with: title, ingredients, instructions, prepTime, cookTime, servings, difficulty, category, tags. Return ONLY valid JSON.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = data?.choices?.[0]?.message?.content;
      const recipe = parseRecipeContent(content);
      if (recipe) {
        return NextResponse.json({
          success: true,
          recipe,
          recipeId: `imported-${Date.now()}`,
        });
      }
    }

    const recipe = buildFallbackRecipe(file, text);

    return NextResponse.json({
      success: true,
      recipeId: `imported-${Date.now()}`,
      recipe,
      message: openaiKey
        ? "AI extraction failed for this upload, so a basic imported recipe was created instead."
        : "Configure OPENAI_API_KEY for full AI extraction.",
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process recipe" },
      { status: 500 }
    );
  }
}
