# Heirloom

**Your family's digital cookbook** — preserve generations of recipes, memories, and traditions.

Heirloom is an AI-powered digital family cookbook that transforms scattered recipes into an organized, searchable, living cookbook that families can enjoy for decades.

## Features

- **Import from anywhere** — Handwritten cards, screenshots, PDFs, social media, bulk folder uploads
- **Smart multi-image grouping** — Multiple screenshots/photos of the same recipe are automatically grouped into one recipe; a review step appears when grouping is uncertain, while distinct recipes still import individually
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

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/storage.sql` in the SQL Editor
4. Copy your project URL and anon key into `.env.local`
5. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`
6. Create an account at `/signup`, then sign in at `/login`

Once signed in, the app loads recipes from your Supabase database. Imports are saved to PostgreSQL and uploaded files go to the `recipe-uploads` storage bucket.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for recipe extraction and AI assistant |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Database Setup

Run these files in your Supabase SQL editor:

```bash
supabase/schema.sql
supabase/storage.sql
supabase/family-invites.sql   # if upgrading an existing database
```

If you already seeded a test user and family manually, sign in with that account instead of creating a new one.

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
