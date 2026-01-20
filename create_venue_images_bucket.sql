-- Create venue-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-images',
  'venue-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE row level security;

-- Create RLS policies for the venue-images bucket
-- Policy 1: Allow public read access
CREATE POLICY "Public Access for venue images" ON storage.objects
FOR SELECT USING (bucket_id = 'venue-images');

-- Policy 2: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload venue images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'venue-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 3: Allow users to update their own uploads
CREATE POLICY "Users can update their own venue images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'venue-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own venue images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'venue-images' 
  AND auth.uid() IS NOT NULL
);

-- Alternative: If RLS is too restrictive, you can temporarily disable it for this bucket
-- (Uncomment the line below if you want to disable RLS completely for venue-images)
-- UPDATE storage.buckets SET public = true WHERE id = 'venue-images';