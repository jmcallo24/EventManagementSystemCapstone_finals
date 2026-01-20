-- Fix multimedia likes and comments issues
-- Run this in Supabase SQL Editor

-- Drop and recreate the unique constraint to ensure it works
ALTER TABLE multimedia_likes DROP CONSTRAINT IF EXISTS multimedia_likes_post_id_user_id_key;
ALTER TABLE multimedia_likes ADD CONSTRAINT multimedia_likes_post_id_user_id_key UNIQUE (post_id, user_id);

-- Make sure RLS is disabled for testing
ALTER TABLE multimedia_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia_likes DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON multimedia_posts TO anon;
GRANT ALL ON multimedia_comments TO anon;
GRANT ALL ON multimedia_likes TO anon;

SELECT 'Multimedia system constraints fixed!' as status;