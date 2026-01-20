-- Create event_favorites table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_favorites_user_id ON event_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);

-- Enable RLS
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own favorites" ON event_favorites;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON event_favorites;

-- Create RLS policies
CREATE POLICY "Users can view their own favorites" ON event_favorites
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own favorites" ON event_favorites
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON event_favorites TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;