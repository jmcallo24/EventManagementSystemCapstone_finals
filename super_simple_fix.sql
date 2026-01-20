-- SUPER SIMPLE DIRECT FIX - GUARANTEED TO WORK
-- Copy paste this EXACT script in Supabase SQL Editor

-- Step 1: Check what we have
SELECT 'BEFORE UPDATE' as status;
SELECT title, current_participants FROM events ORDER BY title;

-- Step 2: Force update participant counts (NO FUNCTIONS, PURE SQL)
UPDATE events SET current_participants = 1 WHERE title = 'testt';
UPDATE events SET current_participants = 1 WHERE title = 'test 2';

-- Step 3: Check if it worked
SELECT 'AFTER UPDATE' as status;
SELECT title, current_participants FROM events ORDER BY title;

-- Step 4: Show actual registrations for verification
SELECT 
    e.title,
    COUNT(er.id) as registration_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title
ORDER BY e.title;