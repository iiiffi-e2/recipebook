# Heirloom

**Your family's digital cookbook** — preserve generations of recipes, memories, and traditions.

Heirloom is an AI-powered digital family cookbook that transforms scattered recipes into an organized, searchable, living cookbook that families can enjoy for decades.

## Features

- **Import from anywhere** — Handwritten cards, screenshots, PDFs, social media, bulk folder uploads
- **AI recipe extraction** — Automatically extracts ingredients, instructions, metadata, and cleans formatting
- **Original preservation** — Every upload is preserved forever alongside the AI-processed version
- **Family memories** — Stories, voice recordings, photos, and traditions attached to every recipe
- **AI cooking assistant** — Natural language help with meal planning, substitutions, and family recipe knowledge
- **Smart organization** — Auto-categorization, tagging, and duplicate detection
- **Meal planning** — Weekly calendar with automatic shopping list generation
- **Cooking mode** — Full-screen step-by-step with timers and ingredient checklists
- **Family sharing** — Invite members, shared cookbook, permissions, activity feed

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** OpenAI GPT-4o (Vision OCR, embeddings, assistant)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the demo cookbook.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for recipe extraction and AI assistant |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Database Setup

Run the SQL schema in your Supabase SQL editor:

```bash
# Schema located at:
supabase/schema.sql
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── app/                  # Main application
│   │   ├── page.tsx          # Cookbook library
│   │   ├── import/           # Recipe import
│   │   ├── assistant/        # AI cooking assistant
│   │   ├── planner/          # Meal planner
│   │   ├── shopping/         # Shopping lists
│   │   ├── memories/         # Family memories
│   │   ├── family/           # Family management
│   │   └── recipes/[id]/     # Recipe detail
│   ├── cook/[id]/            # Full-screen cooking mode
│   └── api/                  # API routes
├── components/               # UI components
└── lib/                      # Types, data, utilities
```

## Design

Warm cream backgrounds, muted sage accents, terracotta highlights, editorial serif headings paired with modern sans-serif body text. Every interaction is designed to feel like opening a cherished family cookbook.

---

*Preserving recipes, stories, and traditions for generations.*
