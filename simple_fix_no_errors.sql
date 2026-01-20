-- SIMPLE FIX: No complex exception handling, just the essentials
-- Run this ENTIRE script in Supabase SQL Editor

-- 1. Disable RLS completely
ALTER TABLE IF EXISTS event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- 2. Grant full permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. Clean up orphaned data
DELETE FROM event_registrations 
WHERE event_id NOT IN (SELECT id FROM events);

DELETE FROM event_registrations 
WHERE participant_id NOT IN (SELECT id FROM users);

-- 4. Drop constraints (ignore errors)
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_event_id;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS fk_event_registrations_participant_id;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey;
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_participant_id_fkey;

-- 5. Recreate table if needed
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendance_status TEXT DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- 6. Simple registration function
CREATE OR REPLACE FUNCTION register_user_for_event(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_participants INTEGER := 0;
    v_max_participants INTEGER := 50;
BEGIN
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
END;
$$;

-- 7. Simple unregister function
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
END;
$$;

-- 8. Fix counts function
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
        END IF;
    END LOOP;
    
    RETURN 'Fixed participant counts for ' || updated_count || ' events';
END;
$$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION register_user_for_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_user_from_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_participant_counts_now() TO authenticated;

-- 10. Run the fix
SELECT fix_all_participant_counts_now();

-- 11. Show results
SELECT 
    e.title,
    e.current_participants,
    COALESCE(COUNT(er.id), 0) as actual_registrations
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.current_participants
ORDER BY e.title;