-- JUST CHECK EXISTING DATA - NO DUMMY CREATION
-- Run this in Supabase SQL Editor

-- 1. Check events table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 2. Check what events exist
SELECT * FROM events;

-- 3. Check registrations
SELECT COUNT(*) as total_registrations FROM event_registrations;

-- 4. Check if events have wrong status
SELECT title, status, current_participants FROM events;