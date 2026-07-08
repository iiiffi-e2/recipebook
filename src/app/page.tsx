"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BookOpen,
  Upload,
  MessageCircle,
  Heart,
  Sparkles,
  ArrowRight,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "Import from anywhere",
    description:
      "Handwritten cards, screenshots, PDFs, social media — drag hundreds at once and let AI organize everything.",
  },
  {
    icon: Heart,
    title: "Preserve memories",
    description:
      "Stories, voice recordings, photos, and traditions become part of every recipe's living history.",
  },
  {
    icon: MessageCircle,
    title: "AI cooking companion",
    description:
      "Ask what to make tonight, scale recipes, plan holidays, or learn techniques — it knows your family's cookbook.",
  },
  {
    icon: BookOpen,
    title: "Print beautiful cookbooks",
    description:
      "Generate premium hardcover-quality books with photos, stories, and QR codes linking to voice recordings.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-warm-gray/40 bg-cream/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/20 sm:h-10 sm:w-10">
              <ChefHat className="h-5 w-5 text-sage" />
            </div>
            <span className="font-serif text-xl font-medium text-charcoal sm:text-2xl">Heirloom</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/app" className="hidden sm:block">
              <Button variant="ghost">Open Cookbook</Button>
            </Link>
            <Link href="/app/import">
              <Button>
                Start Importing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-12 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div {...fadeUp}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sage/15 px-4 py-2 text-sm text-sage">
                <Sparkles className="h-4 w-4" />
                AI-powered family cookbook
              </div>
              <h1 className="font-serif text-5xl font-medium leading-[1.1] tracking-tight text-charcoal lg:text-7xl">
                Recipes worth
                <br />
                <span className="text-terracotta">passing down</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal-muted">
                Heirloom transforms scattered recipes into a beautiful, searchable,
                living cookbook — preserving not just ingredients, but the stories,
                voices, and traditions that make them special.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/app">
                  <Button size="lg">
                    Explore the Cookbook
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/app/import">
                  <Button size="lg" variant="outline">
                    Import Your Recipes
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-[var(--shadow-card)]">
                <Image
                  src="https://images.unsplash.com/photo-1694505396696-b093cca3d8ea?w=800&h=1000&fit=crop"
                  alt="Grandma's apple pie"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="text-sm uppercase tracking-widest text-ivory/80">
                    Grandma Rose&apos;s
                  </p>
                  <h2 className="font-serif text-3xl font-medium text-ivory">
                    Apple Pie
                  </h2>
                  <p className="mt-2 text-sm text-ivory/70">
                    A Thanksgiving tradition since 1962
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-ivory p-4 shadow-[var(--shadow-card)]">
                <p className="text-xs text-charcoal-muted">Family recipes preserved</p>
                <p className="font-serif text-3xl font-medium text-terracotta">247</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-warm-gray/40 bg-ivory/50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="font-serif text-4xl font-medium text-charcoal lg:text-5xl">
              More than a recipe manager
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-charcoal-muted">
              Every feature designed to honor the emotional connection families have
              with their food traditions.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-ivory p-8 shadow-[var(--shadow-soft)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sage/15">
                  <feature.icon className="h-6 w-6 text-sage" />
                </div>
                <h3 className="font-serif text-2xl font-medium text-charcoal">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-relaxed text-charcoal-muted">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Emotional CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl font-medium leading-tight text-charcoal lg:text-5xl">
              &ldquo;The kitchen is where memories are made, and recipes are how we remember.&rdquo;
            </h2>
            <p className="mt-6 text-charcoal-muted">
              Start preserving your family&apos;s culinary heritage today.
            </p>
            <Link href="/app" className="mt-10 inline-block">
              <Button size="lg">
                Open Your Cookbook
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-gray/40 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row lg:px-12">
          <div className="flex items-center gap-3">
            <ChefHat className="h-5 w-5 text-sage" />
            <span className="font-serif text-lg text-charcoal">Heirloom</span>
          </div>
          <p className="text-sm text-charcoal-muted">
            Preserving recipes, stories, and traditions for generations.
          </p>
        </div>
      </footer>
    </div>
  );
}
