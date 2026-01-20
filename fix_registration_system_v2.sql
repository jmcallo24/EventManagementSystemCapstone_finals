-- Fix Registration System - Run this in Supabase SQL Editor
-- This will fix the "failed to update registration" error

-- 1. Make sure the event_registrations table exists with correct structure
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendance_status TEXT DEFAULT 'registered',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, participant_id)
);

-- 2. Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies with proper permissions
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
CREATE POLICY "Users can view their own registrations" ON event_registrations
    FOR SELECT USING (participant_id = auth.uid());

DROP POLICY IF EXISTS "Users can register themselves" ON event_registrations;
CREATE POLICY "Users can register themselves" ON event_registrations
    FOR INSERT WITH CHECK (participant_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
CREATE POLICY "Users can update their own registrations" ON event_registrations
    FOR UPDATE USING (participant_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own registrations" ON event_registrations;
CREATE POLICY "Users can delete their own registrations" ON event_registrations
    FOR DELETE USING (participant_id = auth.uid());

DROP POLICY IF EXISTS "Admins and organizers can view all registrations" ON event_registrations;
CREATE POLICY "Admins and organizers can view all registrations" ON event_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'organizer')
        )
    );

-- Allow admins to manage all registrations
DROP POLICY IF EXISTS "Admins can manage all registrations" ON event_registrations;
CREATE POLICY "Admins can manage all registrations" ON event_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Allow service role to bypass RLS for functions
ALTER TABLE event_registrations FORCE ROW LEVEL SECURITY;

-- 4. Create simple registration functions
CREATE OR REPLACE FUNCTION register_for_event_simple(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_participants INTEGER;
    v_max_participants INTEGER;
    v_registration_exists BOOLEAN;
    v_participant_id UUID;
    result JSON;
BEGIN
    -- Get the current user ID
    v_participant_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_participant_id IS NULL THEN
        result := json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
        RETURN result;
    END IF;
    
    -- Check if user is already registered
    SELECT EXISTS(
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND participant_id = v_participant_id
    ) INTO v_registration_exists;
    
    IF v_registration_exists THEN
        result := json_build_object(
            'success', false,
            'message', 'You are already registered for this event'
        );
        RETURN result;
    END IF;
    
    -- Get current and max participants
    SELECT 
        COALESCE(current_participants, 0), 
        COALESCE(max_participants, 100)
    INTO v_current_participants, v_max_participants
    FROM events 
    WHERE id = p_event_id;
    
    -- Check if event exists
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'message', 'Event not found'
        );
        RETURN result;
    END IF;
    
    -- Check if event is full
    IF v_current_participants >= v_max_participants THEN
        result := json_build_object(
            'success', false,
            'message', 'Event is full. Maximum participants reached.'
        );
        RETURN result;
    END IF;
    
    -- Register the participant
    INSERT INTO event_registrations (
        event_id,
        participant_id,
        registration_date,
        attendance_status
    ) VALUES (
        p_event_id,
        v_participant_id,
        NOW(),
        'registered'
    );
    
    -- Update participant count
    UPDATE events 
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = p_event_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Successfully registered for the event!'
    );
    
    RETURN result;
END;
$$;

-- 5. Create unregister function
CREATE OR REPLACE FUNCTION unregister_from_event_simple(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_id UUID;
    result JSON;
BEGIN
    -- Get the current user ID
    v_participant_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_participant_id IS NULL THEN
        result := json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
        RETURN result;
    END IF;
    
    -- Remove the registration
    DELETE FROM event_registrations 
    WHERE event_id = p_event_id AND participant_id = v_participant_id;
    
    IF FOUND THEN
        -- Update participant count
        UPDATE events 
        SET current_participants = GREATEST(COALESCE(current_participants, 1) - 1, 0)
        WHERE id = p_event_id;
        
        result := json_build_object(
            'success', true,
            'message', 'Successfully unregistered from the event'
        );
    ELSE
        result := json_build_object(
            'success', false,
            'message', 'Registration not found'
        );
    END IF;
    
    RETURN result;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION register_for_event_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_from_event_simple(UUID) TO authenticated;

-- 7. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON event_registrations TO authenticated;
GRANT SELECT, UPDATE ON events TO authenticated;

-- 8. Create a simple backup registration method
CREATE OR REPLACE FUNCTION register_for_event_direct(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_participant_id UUID;
    v_registration_exists BOOLEAN;
    result JSON;
BEGIN
    -- Get the current user ID
    v_participant_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_participant_id IS NULL THEN
        result := json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
        RETURN result;
    END IF;
    
    -- Check if user is already registered (using direct query)
    PERFORM 1 FROM event_registrations 
    WHERE event_id = p_event_id AND participant_id = v_participant_id;
    
    IF FOUND THEN
        result := json_build_object(
            'success', false,
            'message', 'You are already registered for this event'
        );
        RETURN result;
    END IF;
    
    -- Directly insert registration (bypass RLS for this function)
    BEGIN
        INSERT INTO event_registrations (
            id,
            event_id,
            participant_id,
            registration_date,
            attendance_status,
            created_at
        ) VALUES (
            gen_random_uuid(),
            p_event_id,
            v_participant_id,
            NOW(),
            'registered',
            NOW()
        );
        
        -- Update participant count
        UPDATE events 
        SET current_participants = COALESCE(current_participants, 0) + 1
        WHERE id = p_event_id;
        
        result := json_build_object(
            'success', true,
            'message', 'Successfully registered for the event!'
        );
    EXCEPTION
        WHEN OTHERS THEN
            result := json_build_object(
                'success', false,
                'message', 'Registration failed: ' || SQLERRM
            );
    END;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION register_for_event_direct(UUID) TO authenticated;

-- 9. Create helper functions for participant count updates
CREATE OR REPLACE FUNCTION increment_event_participants(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE events 
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = event_id;
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
END;
$$;

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION increment_event_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_event_participants(UUID) TO authenticated;