-- TEST SCRIPT: Check if functions work and manually fix counts
-- Run this in Supabase SQL Editor to test

-- 1. Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%participant%' OR routine_name LIKE '%register%';

-- 2. Test the fix function directly
SELECT fix_all_participant_counts_now();

-- 3. Show current state
SELECT 
    e.id,
    e.title,
    e.current_participants,
    COUNT(er.id) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;

-- 4. Manually update counts if they're wrong
UPDATE events 
SET current_participants = (
    SELECT COUNT(*) 
    FROM event_registrations 
    WHERE event_id = events.id
);

-- 5. Show updated state
SELECT 
    e.id,
    e.title,
    e.current_participants,
    COUNT(er.id) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;