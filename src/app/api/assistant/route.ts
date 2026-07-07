import { NextRequest, NextResponse } from "next/server";
import { demoRecipes } from "@/lib/demo-data";

const SYSTEM_PROMPT = `You are the Heirloom cooking assistant — a warm, knowledgeable companion who knows the Mitchell family's cookbook intimately. You speak like a family member who grew up with these recipes.

Family cookbook context:
${demoRecipes.map((r) => `- ${r.title} (${r.category}, ${r.prepTime + r.cookTime} min, tags: ${r.tags.join(", ")})${r.source.familyMember ? `, from ${r.source.familyMember}` : ""}`).join("\n")}

Guidelines:
- Be warm, personal, and encouraging
- Reference specific family recipes when relevant
- Help with meal planning, substitutions, scaling, and cooking techniques
- Mention family memories and traditions when appropriate
- Keep responses concise but helpful
- Use markdown sparingly for lists`;

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
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
          message: data.choices?.[0]?.message?.content || "I'm here to help with your family recipes!",
        });
      }
    }

    const q = message.toLowerCase();
    let response = "I'd love to help! Try asking about specific recipes, ingredients, or meal planning.";

    if (q.includes("chicken")) {
      response = "For chicken dishes, your family cookbook has wonderful options. While Dad's Chili uses beef and pork, you might enjoy adapting Mom's Sunday Pot Roast technique for a whole roasted chicken. Would you like me to suggest a chicken recipe to import?";
    } else if (q.includes("thanksgiving")) {
      response = "Thanksgiving in the Mitchell family means Grandma Rose's Apple Pie — a tradition since 1962. Pair it with Dad's Championship Chili the night before, and Mom's Sunday Pot Roast for the main event. Shall I create a full Thanksgiving menu?";
    } else if (q.includes("grandma") || q.includes("dessert")) {
      response = "Grandma Rose's Apple Pie is the crown jewel of your dessert collection. Her handwritten recipe card is preserved, along with a voice recording of her explaining the crust technique. Aunt Lisa's Lemon Bars are another family favorite!";
    } else if (q.includes("vegan")) {
      response = "To make Dad's Championship Chili vegan: swap the meats for 3 lbs plant-based crumbles, add an extra can of beans, and keep the chipotle peppers and chocolate. The smoked paprika gives great depth. Want me to save this as a variation?";
    } else if (q.includes("30 min") || q.includes("quick")) {
      response = "Quick family meals: Fluffy Buttermilk Pancakes (25 min) for breakfast, or Aunt Lisa's Lemon Bars (15 min active prep). Your Quick Meals collection has 22 recipes tagged for busy weeknights.";
    } else if (q.includes("freez")) {
      response = "Recipes that freeze well in your cookbook: Dad's Championship Chili (improves after freezing!) and Nonna's Sunday Gravy (freeze in portions for easy pasta nights).";
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Assistant error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
