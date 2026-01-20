-- CAPS Event Management System - Admin Notification Setup
-- This configures real-time admin notifications for event requests

-- Ensure all admin users exist with proper role
SELECT id, name, email, role, created_at 
FROM users 
WHERE role = 'admin' 
ORDER BY created_at;

-- REAL NOTIFICATION FLOW:
-- =====================

-- 1. PARTICIPANT DASHBOARD → ADMIN NOTIFICATIONS
--    When participant submits event request:
--    • Participant gets: "Event Request Submitted" confirmation
--    • ALL 6 ADMINS get: "📋 New Event Request from Participant" 

-- 2. ORGANIZER DASHBOARD → ADMIN NOTIFICATIONS  
--    When organizer submits event request:
--    • Organizer gets: "Event Request Submitted" confirmation
--    • ALL 6 ADMINS get: "🚨 NEW EVENT REQUEST" 

-- 3. ADMIN APPROVALS → USER NOTIFICATIONS
--    When admin approves/rejects request:
--    • User gets: "Event Approved" or "Event Rejected" with reason

-- 4. USER REGISTRATIONS → ADMIN ALERTS
--    When users register for events:
--    • Admin gets: "High Registration Alert" for capacity planning

-- TARGET ADMIN IDs (hardcoded for reliability):
-- b7cc74a6-de67-4b03-9481-f59a33a4d7f4 (reichard)
-- cdcdefb1-0cbf-44be-a8ae-5e23008878ee (sosa)  
-- 04b63328-231f-4d7b-bad0-4a18d0c0d3f5 (Admin User)
-- fde6ec11-e1ef-4663-a93b-de1e48ff2b6d (Saiz)
-- 72150cf8-b7b7-4a66-90a4-479720ceebef (john michael)
-- fd174ebc-7386-4a25-aee5-da6741d43905 (asdasdasdas)

-- Clean up old test notifications (optional)
-- DELETE FROM notifications WHERE message LIKE '%asdasdas%' OR title LIKE '%asdasdas%';