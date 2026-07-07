-- Heirloom Database Schema for Supabase PostgreSQL
-- Run this in your Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Families (shared cookbooks)
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members with roles
CREATE TYPE member_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'viewer',
  recipes_contributed INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Recipes
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  hero_image TEXT,
  prep_time INTEGER DEFAULT 0,
  cook_time INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 4,
  difficulty difficulty_level DEFAULT 'medium',
  cuisine TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  meal_types TEXT[] DEFAULT '{}',
  cooking_method TEXT,
  nutrition JSONB,
  source JSONB,
  is_favorite BOOLEAN DEFAULT FALSE,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_embedding ON recipes USING ivfflat (embedding vector_cosine_ops);

-- Ingredients
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  amount TEXT,
  unit TEXT,
  name TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Instructions
CREATE TABLE instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  text TEXT NOT NULL,
  timer_minutes INTEGER,
  sort_order INTEGER DEFAULT 0
);

-- Original uploads (always preserved)
CREATE TYPE original_type AS ENUM ('image', 'pdf', 'scan', 'screenshot', 'document');

CREATE TABLE recipe_originals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  type original_type NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories (stories, voice, photos, videos)
CREATE TYPE memory_type AS ENUM ('story', 'voice', 'photo', 'video', 'note', 'comment');

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  type memory_type NOT NULL,
  title TEXT,
  content TEXT,
  media_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_recipes (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, recipe_id)
);

-- Cooking history
CREATE TABLE cooking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  cooked_by UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  cooked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe timeline events
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Import queue
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  status import_status DEFAULT 'pending',
  recipe_id UUID REFERENCES recipes(id),
  error TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plans
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping lists
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount TEXT,
  unit TEXT,
  department TEXT,
  checked BOOLEAN DEFAULT FALSE,
  recipe_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity feed
CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recipe_id UUID REFERENCES recipes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Family members can read their family's data
CREATE POLICY "Family members can view recipes"
  ON recipes FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert recipes"
  ON recipes FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );
