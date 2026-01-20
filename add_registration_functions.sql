-- Registration System Functions for Event Management
-- Run this in Supabase SQL Editor to enable registration functionality

-- Function to register a participant for an event
CREATE OR REPLACE FUNCTION register_for_event(
  p_event_id UUID,
  p_participant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_participants INTEGER;
  v_max_participants INTEGER;
  v_registration_exists BOOLEAN;
  result JSON;
BEGIN
  -- Check if user is already registered
  SELECT EXISTS(
    SELECT 1 FROM event_registrations 
    WHERE event_id = p_event_id AND participant_id = p_participant_id
  ) INTO v_registration_exists;
  
  IF v_registration_exists THEN
    result := json_build_object(
      'success', false,
      'message', 'You are already registered for this event'
    );
    RETURN result;
  END IF;
  
  -- Get current and max participants
  SELECT current_participants, max_participants 
  INTO v_current_participants, v_max_participants
  FROM events 
  WHERE id = p_event_id;
  
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
    p_participant_id,
    NOW(),
    'registered'
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Successfully registered for the event!'
  );
  
  RETURN result;
END;
$$;

-- Function to unregister from an event
CREATE OR REPLACE FUNCTION unregister_from_event(
  p_event_id UUID,
  p_participant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Remove the registration
  DELETE FROM event_registrations 
  WHERE event_id = p_event_id AND participant_id = p_participant_id;
  
  IF FOUND THEN
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION register_for_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unregister_from_event(UUID, UUID) TO authenticated;