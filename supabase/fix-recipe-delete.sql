-- Fix recipe deletion blocked by activity/imports foreign keys.
-- Run this in the Supabase SQL editor for production.

-- Allow editors to remove activity rows when deleting recipes
CREATE POLICY "Editors can delete activity"
  ON activity FOR DELETE
  USING (family_id IN (SELECT public.user_editor_family_ids()));

-- Auto-clear recipe references when a recipe is deleted
ALTER TABLE activity DROP CONSTRAINT IF EXISTS activity_recipe_id_fkey;
ALTER TABLE activity ADD CONSTRAINT activity_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

ALTER TABLE imports DROP CONSTRAINT IF EXISTS imports_recipe_id_fkey;
ALTER TABLE imports ADD CONSTRAINT imports_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;
