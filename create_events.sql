-- CHECK ALL TABLES FOR EVENT DATA
-- Run this in Supabase SQL Editor

-- 1. Check if events table exists and has data
SELECT 'events table:' as info, COUNT(*) as count FROM events;

-- 2. Check event_requests table (baka dito yung events mo)
SELECT 'event_requests table:' as info, COUNT(*) as count FROM event_requests;

-- 3. Show all data from events table
SELECT 'All events:' as info;
SELECT * FROM events LIMIT 10;

-- 4. Show all data from event_requests table  
SELECT 'All event requests:' as info;
SELECT * FROM event_requests LIMIT 10;

-- 5. Create sample events if walang laman
INSERT INTO events (id, title, description, date, time, venue, organizer_id, current_participants, max_participants, status, event_type, organizer_name)
VALUES 
  (gen_random_uuid(), 'testt', 'est', '2025-10-01', '20:52:00', 'test', 'fd174ebc-7386-4a25-aee5-da6741d43905', 1, 50, 'approved', 'watchparty', 'watchparty'),
  (gen_random_uuid(), 'test 2', 'tws2', '2025-10-01', '09:34:00', 'test', 'fd174ebc-7386-4a25-aee5-da6741d43905', 1, 50, 'approved', 'watchparty', 'watchparty'),
  (gen_random_uuid(), 'test 2', 'test', '2025-10-02', '17:39:00', 'test', 'fd174ebc-7386-4a25-aee5-da6741d43905', 1, 50, 'approved', 'watchparty', 'watchparty');

-- 6. Show events after insert
SELECT 'Events after insert:' as info;
SELECT id, title, status, current_participants, max_participants FROM events ORDER BY title;