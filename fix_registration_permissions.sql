-- Fix registration permissions and RLS policies
-- Run this in Supabase SQL Editor

-- First, ensure the event_registrations table exists with proper structure
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendance_status TEXT DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- Enable RLS on the table
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins and organizers can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to register" ON event_registrations;
DROP POLICY IF EXISTS "Allow participants to register for events" ON event_registrations;

-- Create comprehensive RLS policies

-- 1. Allow participants to view their own registrations
CREATE POLICY "Users can view their own registrations" ON event_registrations
    FOR SELECT USING (
        auth.uid() = participant_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'organizer')
        )
    );

-- 2. Allow participants to register for events (INSERT)
CREATE POLICY "Allow participants to register for events" ON event_registrations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'participant'
            AND users.is_active = true
        )
    );

-- 3. Allow participants to update their own registrations
CREATE POLICY "Users can update their own registrations" ON event_registrations
    FOR UPDATE USING (
        auth.uid() = participant_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'organizer')
        )
    );

-- 4. Allow participants to unregister (DELETE)
CREATE POLICY "Users can delete their own registrations" ON event_registrations
    FOR DELETE USING (
        auth.uid() = participant_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'organizer')
        )
    );

-- Create or replace the registration functions with SECURITY DEFINER

-- Function to register for event (bypasses RLS)
CREATE OR REPLACE FUNCTION register_for_event_simple(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_current_participants INTEGER;
    v_max_participants INTEGER;
    v_result JSON;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- If no auth.uid(), try to get from session or context
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if user is a participant
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND role = 'participant' 
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Only active participants can register for events'
        );
    END IF;

    -- Check if already registered
    IF EXISTS (
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND participant_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'You are already registered for this event'
        );
    END IF;

    -- Check event capacity
    SELECT current_participants, max_participants 
    INTO v_current_participants, v_max_participants
    FROM events 
    WHERE id = p_event_id;

    IF v_current_participants >= v_max_participants THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Event has reached maximum capacity'
        );
    END IF;

    -- Insert registration
    INSERT INTO event_registrations (event_id, participant_id, registration_date, attendance_status)
    VALUES (p_event_id, v_user_id, NOW(), 'registered');

    -- Update participant count
    UPDATE events 
    SET current_participants = current_participants + 1 
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

-- Function to register with specific user ID (for localStorage auth)
CREATE OR REPLACE FUNCTION register_for_event_with_user_id(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_participants INTEGER;
    v_max_participants INTEGER;
BEGIN
    -- Check if user exists and is a participant
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id 
        AND role = 'participant' 
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid user or user is not an active participant'
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

    -- Check event capacity
    SELECT current_participants, max_participants 
    INTO v_current_participants, v_max_participants
    FROM events 
    WHERE id = p_event_id;

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
    SET current_participants = current_participants + 1 
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

-- Function to unregister
CREATE OR REPLACE FUNCTION unregister_from_event_with_user_id(p_event_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SET current_participants = GREATEST(0, current_participants - 1) 
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

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION register_for_event_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION register_for_event_with_user_id(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_from_event_with_user_id(UUID, UUID) TO authenticated;

-- Function to count registrations for an event (bypasses RLS)
CREATE OR REPLACE FUNCTION count_event_registrations(p_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    registration_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO registration_count
    FROM event_registrations 
    WHERE event_id = p_event_id;
    
    RETURN registration_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_event_registrations(UUID) TO authenticated;

-- Create trigger to automatically update participant count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET current_participants = (
            SELECT COUNT(*) FROM event_registrations 
            WHERE event_id = NEW.event_id
        )
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET current_participants = (
            SELECT COUNT(*) FROM event_registrations 
            WHERE event_id = OLD.event_id
        )
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_participant_count ON event_registrations;

-- Create the trigger
CREATE TRIGGER trigger_update_participant_count
    AFTER INSERT OR DELETE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_participant_count();

-- Ensure proper permissions on the events table for participant count updates
GRANT SELECT, UPDATE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON event_registrations TO authenticated;

-- Function to fix/recalculate all participant counts
CREATE OR REPLACE FUNCTION fix_all_participant_counts()
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
    FOR event_record IN SELECT id, title, current_participants FROM events LOOP
        -- Get actual count from registrations table
        SELECT COUNT(*) INTO actual_count
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_all_participant_counts() TO authenticated;

-- Run the fix function immediately
SELECT fix_all_participant_counts();