-- FORCE UPDATE PARTICIPANT COUNTS NOW
-- Run this immediately in Supabase SQL Editor

-- 1. Show current mismatch
SELECT 
    e.title,
    e.current_participants as shown_count,
    COUNT(er.id) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;

-- 2. Force update all event participant counts
UPDATE events 
SET current_participants = (
    SELECT COUNT(*) 
    FROM event_registrations 
    WHERE event_id = events.id
);

-- 3. Show updated counts
SELECT 
    e.title,
    e.current_participants as updated_count,
    COUNT(er.id) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;

-- 4. Show all registrations for verification
SELECT 
    e.title as event_name,
    u.name as participant_name,
    er.registration_date
FROM event_registrations er
JOIN events e ON er.event_id = e.id
JOIN users u ON er.participant_id = u.id
ORDER BY e.title, er.registration_date;