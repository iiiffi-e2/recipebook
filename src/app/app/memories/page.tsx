"use client";

import { motion } from "framer-motion";
import { BookOpen, Mic, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { demoRecipes } from "@/lib/demo-data";
import { formatDate } from "@/lib/utils";

const memoryIcons = {
  story: BookOpen,
  voice: Mic,
  photo: Heart,
  video: Heart,
  note: MessageCircle,
  comment: MessageCircle,
};

export default function MemoriesPage() {
  const allMemories = demoRecipes.flatMap((recipe) =>
    recipe.memories.map((memory) => ({ ...memory, recipe }))
  );

  return (
    <>
      <Header
        title="Family Memories"
        subtitle="The stories, voices, and traditions behind every recipe"
      />

      <div className="space-y-8">
        {allMemories.length > 0 ? (
          allMemories.map((memory, i) => {
            const Icon = memoryIcons[memory.type] || BookOpen;
            return (
              <motion.article
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="overflow-hidden rounded-2xl bg-ivory shadow-[var(--shadow-soft)]"
              >
                <div className="grid md:grid-cols-3">
                  <div className="relative aspect-[4/3] md:aspect-auto">
                    <Image
                      src={memory.recipe.heroImage}
                      alt={memory.recipe.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-8 md:col-span-2">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/15">
                        <Icon className="h-5 w-5 text-sage" />
                      </div>
                      <div>
                        <Badge variant="sage" className="mb-1">
                          {memory.type}
                        </Badge>
                        <p className="text-sm text-charcoal-muted">
                          {memory.author} · {formatDate(memory.createdAt)}
                        </p>
                      </div>
                    </div>
                    {memory.title && (
                      <h3 className="font-serif text-2xl font-medium text-charcoal mb-3">
                        {memory.title}
                      </h3>
                    )}
                    <p className="text-lg leading-relaxed text-charcoal-muted italic">
                      &ldquo;{memory.content}&rdquo;
                    </p>
                    <Link
                      href={`/app/recipes/${memory.recipe.id}`}
                      className="mt-6 inline-flex items-center gap-2 text-sm text-terracotta hover:underline"
                    >
                      From {memory.recipe.title} →
                    </Link>
                  </div>
                </div>
              </motion.article>
            );
          })
        ) : (
          <p className="text-center text-charcoal-muted py-16">
            No memories yet. Add stories to your recipes to preserve family history.
          </p>
        )}
      </div>
    </>
  );
}
