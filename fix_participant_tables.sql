-- Run this script to create missing tables for participant dashboard

-- 1. Create event_favorites table
CREATE TABLE IF NOT EXISTS event_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- 2. Create event_registrations table  
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL,
    event_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'registered',
    UNIQUE(participant_id, event_id)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_favorites_user_id ON event_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_participant_id ON event_registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);

-- 4. Disable RLS temporarily for development (you can enable later with proper policies)
ALTER TABLE event_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON event_favorites TO anon, authenticated;
GRANT ALL ON event_registrations TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ===================================================================
-- CLEAN SETUP COMPLETE - NO DUMMY DATA ADDED
-- ===================================================================
-- Tables created successfully! Ready for real data only.
-- Your participant dashboard is now functional but will start empty.