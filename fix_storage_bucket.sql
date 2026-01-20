-- Quick fix for venue-images storage bucket RLS issue
-- Run this in your Supabase SQL Editor

-- Method 1: Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Method 2: Temporarily disable RLS for venue-images uploads (Quick Fix)
-- This allows any authenticated user to upload images
CREATE POLICY "Allow authenticated uploads to venue-images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'venue-images'
);

-- Method 3: Allow public read access
CREATE POLICY "Allow public read access to venue-images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'venue-images'
);

-- If the above doesn't work, you can also try:
-- UPDATE storage.buckets SET public = true WHERE id = 'venue-images';

-- Check if the bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'venue-images';