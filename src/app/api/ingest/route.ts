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
    const files = formData.getAll("file").filter((v): v is File => v instanceof File);
    const file = files[0] ?? null;
    const text = formData.get("text") as string | null;

    if (files.length === 0 && !text) {
      return NextResponse.json({ error: "No file or text provided" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (files.some((f) => f.type === "application/pdf")) {
      return NextResponse.json(
        {
          error:
            "PDF import is not supported yet. Try a photo or screenshot of the recipe, or paste the text instead.",
        },
        { status: 422 }
      );
    }

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (openaiKey && imageFiles.length > 0) {
      const imageParts = await Promise.all(
        imageFiles.map(async (f) => {
          const base64 = Buffer.from(await f.arrayBuffer()).toString("base64");
          const mimeType = f.type || "image/jpeg";
          return {
            type: "image_url" as const,
            image_url: { url: `data:${mimeType};base64,${base64}` },
          };
        })
      );

      const data = await callOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a recipe extraction expert. The user may provide MULTIPLE images that are different pages/screenshots of ONE single recipe. Combine them into ONE recipe. Return a JSON object with these fields:
              title, description, ingredients (array of {amount, unit, name, notes}), instructions (array of {step, text, timerMinutes}),
              prepTime (minutes), cookTime (minutes), servings, difficulty (easy/medium/hard), cuisine, category, tags (array),
              cookingMethod, source. Clean formatting, remove ads and irrelevant text. Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  imageParts.length > 1
                    ? "These images are pages of a single recipe. Extract one combined recipe. Return JSON only."
                    : "Extract the recipe from this image. Return JSON only.",
              },
              ...imageParts,
            ],
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

    const firstTextFile = files.find(
      (f) => !f.type.startsWith("image/") && f.type !== "application/pdf"
    );
    const effectiveText = text ?? (firstTextFile ? await firstTextFile.text() : null);

    if (openaiKey && effectiveText) {
      const data = await callOpenAI({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Extract recipe information and return JSON with: title, description, ingredients (array of {amount, unit, name, notes}), instructions (array of {step, text, timerMinutes}), prepTime (minutes), cookTime (minutes), servings, difficulty (easy/medium/hard), category, tags (array). Return ONLY valid JSON.",
          },
          { role: "user", content: effectiveText },
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

    const recipe = buildFallbackRecipe(file, effectiveText ?? text);

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
