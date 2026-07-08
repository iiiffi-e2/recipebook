import { NextRequest, NextResponse } from "next/server";
import {
  buildAssistantFallbackResponse,
  buildAssistantSystemPrompt,
} from "@/lib/assistant-context";
import { createClient } from "@/lib/supabase/server";
import { getUserFamily } from "@/lib/supabase/family";
import { fetchFamilyRecipes } from "@/lib/supabase/recipes";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let recipes: Awaited<ReturnType<typeof fetchFamilyRecipes>> = [];
    let familyName = "family";

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const family = await getUserFamily(supabase, user.id);
      if (family) {
        familyName = family.name;
        recipes = await fetchFamilyRecipes(supabase, family.familyId);
      }
    }

    const systemPrompt = buildAssistantSystemPrompt(recipes, familyName);
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          message:
            data.choices?.[0]?.message?.content ||
            buildAssistantFallbackResponse(message, recipes, familyName),
        });
      }
    }

    return NextResponse.json({
      message: buildAssistantFallbackResponse(message, recipes, familyName),
    });
  } catch (error) {
    console.error("Assistant error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
