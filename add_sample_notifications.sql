-- Add sample notifications for testing the notification system
DO $$
DECLARE
    admin_user_id UUID;
    participant_user_id UUID;
    organizer_user_id UUID;
    sample_event_id UUID;
BEGIN
    -- Get sample user IDs (adjust these based on your actual user data)
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO participant_user_id FROM users WHERE role = 'participant' LIMIT 1;
    SELECT id INTO organizer_user_id FROM users WHERE role = 'organizer' LIMIT 1;
    SELECT id INTO sample_event_id FROM events LIMIT 1;

    -- If no users found, skip notification creation
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'No admin user found, skipping admin notifications';
        RETURN;
    END IF;

    -- Insert sample notifications for admin
    INSERT INTO notifications (user_id, title, message, type, is_read, related_event_id, created_at) VALUES
    (admin_user_id, 'New Event Request Submitted', 'John Doe submitted a new event request: "Annual Sports Festival"', 'event_request', false, sample_event_id, NOW() - INTERVAL '2 hours'),
    (admin_user_id, 'Event Approval Needed', 'Maria Santos submitted "Science Fair 2025" for approval', 'event_request', false, sample_event_id, NOW() - INTERVAL '5 hours'),
    (admin_user_id, 'High Registration Activity', '25 new participants registered today across all events', 'announcement', true, NULL, NOW() - INTERVAL '1 day'),
    (admin_user_id, 'System Update Complete', 'Notification system has been successfully activated', 'announcement', true, NULL, NOW() - INTERVAL '2 days');

    -- Insert sample notifications for participant (if exists)
    IF participant_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, is_read, related_event_id, created_at) VALUES
        (participant_user_id, 'Event Request Approved! 🎉', 'Great news! Your event request "Student Workshop" has been approved by the admin', 'event_approved', false, sample_event_id, NOW() - INTERVAL '3 hours'),
        (participant_user_id, 'Registration Confirmed', 'Your registration for "Annual Sports Festival" has been confirmed', 'registration', false, sample_event_id, NOW() - INTERVAL '6 hours'),
        (participant_user_id, 'Event Reminder', 'Your event "Student Workshop" is scheduled for tomorrow at 2:00 PM', 'announcement', true, sample_event_id, NOW() - INTERVAL '1 day');
    END IF;

    -- Insert sample notifications for organizer (if exists)
    IF organizer_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, is_read, related_event_id, created_at) VALUES
        (organizer_user_id, 'New Participant Joined', 'Alex Johnson has registered for your event "Photography Workshop"', 'participant_joined', false, sample_event_id, NOW() - INTERVAL '1 hour'),
        (organizer_user_id, 'Event Request Status', 'Your event request "Music Concert" is under review by admin', 'announcement', false, sample_event_id, NOW() - INTERVAL '4 hours'),
        (organizer_user_id, 'Participant Registration', 'Sarah Miller has registered for your "Coding Bootcamp" event', 'participant_joined', true, sample_event_id, NOW() - INTERVAL '2 days');
    END IF;

    RAISE NOTICE 'Sample notifications created successfully!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating sample notifications: %', SQLERRM;
END $$;

-- Show notification counts by user
SELECT 
    u.name,
    u.role,
    COUNT(n.id) as total_notifications,
    COUNT(CASE WHEN n.is_read = false THEN 1 END) as unread_notifications
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.name, u.role
ORDER BY u.role, u.name;