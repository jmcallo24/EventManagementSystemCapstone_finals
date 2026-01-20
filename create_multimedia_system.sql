-- Create multimedia posts table
CREATE TABLE IF NOT EXISTS multimedia_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL DEFAULT 'organizer',
  title TEXT,
  content TEXT NOT NULL,
  media_type VARCHAR(50) CHECK (media_type IN ('image', 'video', 'text', 'meme')),
  media_url TEXT,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create multimedia comments table
CREATE TABLE IF NOT EXISTS multimedia_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES multimedia_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create multimedia likes table
CREATE TABLE IF NOT EXISTS multimedia_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES multimedia_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Disable RLS temporarily to allow posting
ALTER TABLE multimedia_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE multimedia_likes DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON multimedia_posts TO authenticated;
GRANT ALL ON multimedia_posts TO anon;
GRANT ALL ON multimedia_comments TO authenticated;
GRANT ALL ON multimedia_comments TO anon;
GRANT ALL ON multimedia_likes TO authenticated;
GRANT ALL ON multimedia_likes TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_multimedia_posts_user ON multimedia_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_multimedia_posts_active ON multimedia_posts(is_active);
CREATE INDEX IF NOT EXISTS idx_multimedia_posts_approved ON multimedia_posts(is_approved);
CREATE INDEX IF NOT EXISTS idx_multimedia_comments_post ON multimedia_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_multimedia_likes_post ON multimedia_likes(post_id);

SELECT 'Multimedia system created successfully!' as status;