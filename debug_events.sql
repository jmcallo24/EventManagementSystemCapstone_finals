-- DEBUG: Check why no events are loading
-- Run this in Supabase SQL Editor

-- 1. Check if events exist
SELECT 'Total events:' as info, COUNT(*) as count FROM events;

-- 2. Check event status
SELECT status, COUNT(*) as count FROM events GROUP BY status;

-- 3. Check specific events
SELECT id, title, status, current_participants, max_participants FROM events ORDER BY title;

-- 4. Force set status to approved if needed
UPDATE events SET status = 'approved' WHERE status != 'approved';

-- 5. Check after update
SELECT 'After status fix:' as info;
SELECT id, title, status, current_participants, max_participants FROM events ORDER BY title;