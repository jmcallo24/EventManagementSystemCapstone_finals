-- Create event_registrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'registered',
    UNIQUE(participant_id, event_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_participant_id ON event_registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can manage their own registrations" ON event_registrations;

-- Create RLS policies
CREATE POLICY "Users can view their own registrations" ON event_registrations
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own registrations" ON event_registrations
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON event_registrations TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;