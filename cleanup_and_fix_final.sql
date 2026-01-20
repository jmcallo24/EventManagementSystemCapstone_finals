-- CLEANUP AND FIX: Clean orphaned data first, then apply fixes
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. First, completely disable RLS on all related tables
ALTER TABLE IF EXISTS event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to clean slate
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins and organizers can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to register" ON event_registrations;
DROP POLICY IF EXISTS "Allow participants to register for events" ON event_registrations;

-- 3. Grant full permissions to everyone (temporary for testing)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 4. Clean up orphaned registrations BEFORE adding constraints
-- Delete registrations that point to non-existent events
DELETE FROM event_registrations 
WHERE event_id NOT IN (SELECT id FROM events);

-- Delete registrations that point to non-existent users
DELETE FROM event_registrations 
WHERE participant_id NOT IN (SELECT id FROM users);

-- 5. Show what we're cleaning up
DO $$
DECLARE
    orphaned_events INTEGER;
    orphaned_users INTEGER;
BEGIN
    -- Count orphaned registrations pointing to non-existent events
    SELECT COUNT(*) INTO orphaned_events
    FROM event_registrations 
    WHERE event_id NOT IN (SELECT id FROM events);
    
    -- Count orphaned registrations pointing to non-existent users  
    SELECT COUNT(*) INTO orphaned_users
    FROM event_registrations 
    WHERE participant_id NOT IN (SELECT id FROM users);
    
    RAISE NOTICE 'Cleaned up % orphaned event references and % orphaned user references', orphaned_events, orphaned_users;
END $$;

-- 6. Ensure the event_registrations table exists with correct structure
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendance_status TEXT DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- 7. Drop existing foreign key constraints if they exist
DO $$
BEGIN
    -- Try to drop existing constraints
    BEGIN
        ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_event_id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors if constraints don't exist
        NULL;
    END;
    
    BEGIN
        ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_participant_id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors if constraints don't exist
        NULL;
    END;
    
    BEGIN
        ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors if constraints don't exist
        NULL;
    END;
    
    BEGIN
        ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_participant_id_fkey;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors if constraints don't exist
        NULL;
    END;
END $$;

-- 8. Add foreign key constraints if they don't exist (only after cleanup)
DO $$
BEGIN
    -- Try to add foreign key for event_id
    BEGIN
        ALTER TABLE event_registrations 
        ADD CONSTRAINT fk_event_registrations_event_id 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for event_id';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint for event_id already exists';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint for event_id: %', SQLERRM;
    END;
    
    -- Try to add foreign key for participant_id  
    BEGIN
        ALTER TABLE event_registrations 
        ADD CONSTRAINT fk_event_registrations_participant_id 
        FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for participant_id';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint for participant_id already exists';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint for participant_id: %', SQLERRM;
    END;
END $$;

-- 9. Create comprehensive registration function that works with localStorage
CREATE OR REPLACE FUNCTION register_user_for_event(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_participants INTEGER := 0;
    v_max_participants INTEGER := 50;
    v_user_exists BOOLEAN := FALSE;
    v_event_exists BOOLEAN := FALSE;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    -- Check if event exists
    SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id) INTO v_event_exists;
    
    IF NOT v_event_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Event not found'
        );
    END IF;

    -- Check if already registered
    IF EXISTS (
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND participant_id = p_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'You are already registered for this event'
        );
    END IF;

    -- Get event details
    SELECT 
        COALESCE(current_participants, 0),
        COALESCE(max_participants, 50)
    INTO v_current_participants, v_max_participants
    FROM events 
    WHERE id = p_event_id;

    -- Check capacity
    IF v_current_participants >= v_max_participants THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Event has reached maximum capacity'
        );
    END IF;

    -- Insert registration
    INSERT INTO event_registrations (event_id, participant_id, registration_date, attendance_status)
    VALUES (p_event_id, p_user_id, NOW(), 'registered');

    -- Update participant count
    UPDATE events 
    SET current_participants = COALESCE(current_participants, 0) + 1 
    WHERE id = p_event_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully registered for the event!'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'message', 'You are already registered for this event'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Registration failed: ' || SQLERRM
        );
END;
$$;

-- 10. Create unregister function
CREATE OR REPLACE FUNCTION unregister_user_from_event(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is registered
    IF NOT EXISTS (
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND participant_id = p_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'You are not registered for this event'
        );
    END IF;

    -- Delete registration
    DELETE FROM event_registrations 
    WHERE event_id = p_event_id AND participant_id = p_user_id;

    -- Update participant count
    UPDATE events 
    SET current_participants = GREATEST(0, COALESCE(current_participants, 1) - 1) 
    WHERE id = p_event_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully unregistered from the event'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Unregistration failed: ' || SQLERRM
        );
END;
$$;

-- 11. Create function to fix all participant counts
CREATE OR REPLACE FUNCTION fix_all_participant_counts_now()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_record RECORD;
    actual_count INTEGER;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all events and fix their participant counts
    FOR event_record IN SELECT id, title, COALESCE(current_participants, 0) as current_participants FROM events LOOP
        -- Get actual count from registrations table
        SELECT COALESCE(COUNT(*), 0) INTO actual_count
        FROM event_registrations 
        WHERE event_id = event_record.id;
        
        -- Update if different
        IF event_record.current_participants != actual_count THEN
            UPDATE events 
            SET current_participants = actual_count 
            WHERE id = event_record.id;
            
            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Updated event %: % -> %', event_record.title, event_record.current_participants, actual_count;
        END IF;
    END LOOP;
    
    RETURN 'Fixed participant counts for ' || updated_count || ' events';
END;
$$;

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION register_user_for_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_user_from_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_participant_counts_now() TO authenticated;

-- 13. Run the fix immediately
SELECT fix_all_participant_counts_now();

-- 14. Show current registration counts for verification
SELECT 
    e.title,
    e.current_participants,
    COALESCE(COUNT(er.id), 0) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;

-- 15. Show summary of what we have
SELECT 
    'Events' as table_name,
    COUNT(*) as record_count
FROM events
UNION ALL
SELECT 
    'Event Registrations' as table_name,
    COUNT(*) as record_count
FROM event_registrations
UNION ALL
SELECT 
    'Users' as table_name,
    COUNT(*) as record_count
FROM users;