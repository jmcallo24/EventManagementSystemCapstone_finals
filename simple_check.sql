-- SIMPLE CHECK - NO DUMMY DATA
-- Run this in Supabase SQL Editor

-- 1. Check what's actually in events table
SELECT COUNT(*) as total_events FROM events;

-- 2. Show all events with all columns
SELECT * FROM events;

-- 3. Check registrations table
SELECT COUNT(*) as total_registrations FROM event_registrations;

-- 4. Show registrations with event names
SELECT 
    er.id,
    e.title as event_name,
    er.participant_id,
    er.registration_date
FROM event_registrations er
LEFT JOIN events e ON er.event_id = e.id
ORDER BY er.registration_date DESC;