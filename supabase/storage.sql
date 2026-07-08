-- Run this in the Supabase SQL editor after schema.sql

-- Create the bucket, and if it already exists ensure it is marked public.
-- (A private bucket makes the /object/public/ URLs return "Bucket not found".)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-uploads', 'recipe-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Anyone can read recipe uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-uploads');

CREATE POLICY "Family members can read recipe uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recipe-uploads');

CREATE POLICY "Editors can upload recipe files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-uploads');

CREATE POLICY "Editors can update recipe files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-uploads')
WITH CHECK (bucket_id = 'recipe-uploads');

CREATE POLICY "Editors can delete recipe files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-uploads');
