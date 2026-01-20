-- Fix Registration Count Issue
-- This ensures participant counts are properly updated when users register

-- 1. First, let's make sure the registration function exists and is working
CREATE OR REPLACE FUNCTION register_user_for_event(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_participants INTEGER := 0;
    v_max_participants INTEGER := 50;
    v_user_exists BOOLEAN := FALSE;
    v_event_title TEXT := '';
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
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
        COALESCE(max_participants, 50),
        title
    INTO v_current_participants, v_max_participants, v_event_title
    FROM events 
    WHERE id = p_event_id;

    -- Check if event exists
    IF v_event_title IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Event not found'
        );
    END IF;

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

    -- Update participant count IMMEDIATELY
    UPDATE events 
    SET current_participants = COALESCE(current_participants, 0) + 1 
    WHERE id = p_event_id;

    -- Log the registration for debugging
    RAISE NOTICE 'User % registered for event % (%), new count: %', 
        p_user_id, p_event_id, v_event_title, v_current_participants + 1;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully registered for the event!',
        'new_participant_count', v_current_participants + 1,
        'event_title', v_event_title
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

-- 2. Create helper functions for manual count updates
CREATE OR REPLACE FUNCTION increment_event_participants(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE events 
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = event_id;
    
    RAISE NOTICE 'Incremented participant count for event %', event_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_event_participants(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE events 
    SET current_participants = GREATEST(COALESCE(current_participants, 1) - 1, 0)
    WHERE id = event_id;
    
    RAISE NOTICE 'Decremented participant count for event %', event_id;
END;
$$;

-- 3. Function to fix/sync all participant counts based on actual registrations
CREATE OR REPLACE FUNCTION sync_all_participant_counts()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
    event_record RECORD;
BEGIN
    -- Update all events with correct participant count
    FOR event_record IN 
        SELECT 
            e.id,
            e.title,
            e.current_participants as old_count,
            COUNT(er.id) as actual_count
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        GROUP BY e.id, e.title, e.current_participants
    LOOP
        IF COALESCE(event_record.old_count, 0) != event_record.actual_count THEN
            UPDATE events 
            SET current_participants = event_record.actual_count
            WHERE id = event_record.id;
            
            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Updated event "%" (%) from % to % participants', 
                event_record.title, event_record.id, 
                COALESCE(event_record.old_count, 0), event_record.actual_count;
        END IF;
    END LOOP;
    
    RETURN 'Synced participant counts for ' || updated_count || ' events';
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION register_user_for_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_event_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_event_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_participant_counts() TO authenticated;

-- 5. Fix any existing count discrepancies immediately
SELECT sync_all_participant_counts();

-- 6. Show current event participant counts for verification
SELECT 
    id,
    title,
    current_participants,
    (SELECT COUNT(*) FROM event_registrations WHERE event_id = events.id) as actual_registrations,
    max_participants
FROM events 
ORDER BY created_at DESC;