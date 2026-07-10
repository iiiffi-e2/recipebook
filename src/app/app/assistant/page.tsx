"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, ChefHat } from "lucide-react";
import { AssistantMessageContent } from "@/components/assistant-message";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useFamilyInfo } from "@/components/providers/recipes-provider";
import type { ChatMessage } from "@/lib/types";

const suggestions = [
  "What can I make with chicken?",
  "Plan a holiday dinner",
  "Show dessert recipes",
  "What freezes well?",
  "Suggest a vegetarian option",
  "Recipes under 30 minutes",
];

export default function AssistantPage() {
  const { chatMessages, addChatMessage } = useAppStore();
  const { family } = useFamilyInfo();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const familyLabel = family?.name ? `${family.name} family` : "family";

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

    const history = chatMessages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      let content: string;
      let recipeReferences: string[] | undefined;
      if (response.ok) {
        const data = await response.json();
        content = data.message;
        recipeReferences = data.recipeReferences;
      } else {
        content =
          "Sorry, I couldn't reach the cooking assistant right now. Please try again in a moment.";
      }

      addChatMessage({
        id: `msg-${crypto.randomUUID()}-assistant`,
        role: "assistant",
        content,
        recipeReferences,
        timestamp: new Date().toISOString(),
      });
    } catch {
      addChatMessage({
        id: `msg-${crypto.randomUUID()}-assistant`,
        role: "assistant",
        content:
          "Sorry, something went wrong. Please check your connection and try again.",
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
        subtitle={`Ask anything about your ${familyLabel}'s recipes — I know them by heart`}
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
                {message.role === "assistant" ? (
                  <AssistantMessageContent content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </p>
                )}
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
