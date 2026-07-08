"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, ChefHat } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

const suggestions = [
  "What can I make with chicken?",
  "Plan Thanksgiving dinner",
  "Show Grandma's desserts",
  "What freezes well?",
  "Make Dad's chili vegan",
  "Recipes under 30 minutes",
];

const demoResponses: Record<string, string> = {
  chicken:
    "Based on your family cookbook, you could make Mom's Sunday Pot Roast (though it uses beef, it's a Sunday classic!) or try adapting Dad's Championship Chili. For chicken specifically, I'd suggest importing Grandma's chicken pot pie recipe — would you like me to help with that?",
  thanksgiving:
    "For Thanksgiving, your cookbook has these traditions:\n\n• Grandma Rose's Apple Pie (dessert)\n• Dad's Championship Chili (for the night before)\n• Mom's Sunday Pot Roast (main course alternative)\n\nI'd recommend starting with the apple pie — it's been made every Thanksgiving since 1962!",
  grandma:
    "Grandma Rose's recipes in your cookbook:\n\n• **Apple Pie** — The Thanksgiving centerpiece, with her handwritten card preserved\n• Her voice recording explaining the crust technique is attached\n\nShe contributed 15 recipes total to the family collection.",
  freez:
    "These family recipes freeze well:\n\n• **Dad's Championship Chili** — Actually improves after freezing! Makes a big batch perfect for meal prep.\n• **Nonna's Sunday Gravy** — Freeze in portions for easy pasta nights.\n\nBoth are tagged 'freezes-well' in your cookbook.",
  vegan:
    "To make Dad's Championship Chili vegan:\n\n• Replace ground beef and pork with 3 lbs plant-based crumbles\n• Add an extra can of beans for texture\n• The chipotle peppers and chocolate remain — they're naturally vegan!\n• Consider adding smoked paprika for depth\n\nWant me to create a saved variation?",
  "30 min":
    "Quick family recipes under 30 minutes:\n\n• **Fluffy Buttermilk Pancakes** — 25 min total, perfect for Saturday mornings\n• **Aunt Lisa's Lemon Bars** — 60 min but only 15 min active prep\n\nFor true weeknight speed, your 'Quick Meals' collection has 22 recipes.",
};

function getResponse(query: string): string {
  const q = query.toLowerCase();
  for (const [key, response] of Object.entries(demoResponses)) {
    if (q.includes(key)) return response;
  }
  return `I'd love to help with that! Based on your Mitchell Family cookbook with 6 preserved recipes, I can search ingredients, scale portions, suggest pairings, or help plan meals. Try asking about specific recipes, ingredients, or occasions like "Plan Thanksgiving" or "What did Mom make most often?"`;
}

export default function AssistantPage() {
  const { chatMessages, addChatMessage } = useAppStore();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      let content: string;
      if (response.ok) {
        const data = await response.json();
        content = data.message;
      } else {
        content = getResponse(text);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      addChatMessage({
        id: `msg-${crypto.randomUUID()}-assistant`,
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      });
    } catch {
      addChatMessage({
        id: `msg-${crypto.randomUUID()}-assistant`,
        role: "assistant",
        content: getResponse(text),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <Header
        title="Cooking Assistant"
        subtitle="Ask anything about your family's recipes — I know them by heart"
      />

      <div className="flex h-[calc(100vh-16rem)] flex-col rounded-2xl bg-ivory shadow-[var(--shadow-soft)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatMessages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage/15">
                <Sparkles className="h-8 w-8 text-sage" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-charcoal">
                How can I help you cook today?
              </h3>
              <p className="mt-2 max-w-md text-charcoal-muted">
                I know every recipe in your family cookbook. Ask me to plan meals,
                find recipes, scale portions, or share family cooking wisdom.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-warm-gray bg-cream px-4 py-2 text-sm text-charcoal-muted transition-colors hover:border-sage hover:text-charcoal"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sage/20">
                  <ChefHat className="h-4 w-4 text-sage" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  message.role === "user"
                    ? "bg-terracotta text-ivory"
                    : "bg-cream text-charcoal"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/20">
                <ChefHat className="h-4 w-4 text-sage" />
              </div>
              <div className="rounded-2xl bg-cream px-5 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-sage" />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-sage [animation-delay:0.2s]" />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-sage [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-warm-gray/60 p-4"
        >
          <div className="flex gap-3">
            <Input
              placeholder="Ask about recipes, ingredients, meal planning..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
