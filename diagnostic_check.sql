-- ===================================================================
-- DIAGNOSTIC SCRIPT - Check what's working
-- ===================================================================

-- Check if tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'events', 'event_requests', 'event_favorites', 'event_registrations')
ORDER BY table_name;

-- Check how many records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'events' as table_name, COUNT(*) as record_count FROM events  
UNION ALL
SELECT 'event_requests' as table_name, COUNT(*) as record_count FROM event_requests
UNION ALL 
SELECT 'event_favorites' as table_name, COUNT(*) as record_count FROM event_favorites
UNION ALL
SELECT 'event_registrations' as table_name, COUNT(*) as record_count FROM event_registrations;

-- Check sample data
SELECT 'Sample Events:' as info;
SELECT id, title, date, status FROM events LIMIT 5;

SELECT 'Sample Users:' as info;  
SELECT id, name, email, role FROM users LIMIT 3;