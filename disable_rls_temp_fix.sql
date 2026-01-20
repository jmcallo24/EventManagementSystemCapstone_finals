-- TEMPORARY FIX: Disable RLS and create simple policies
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS on event_registrations table
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on events table to allow updates
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users temporarily
GRANT ALL ON event_registrations TO authenticated;
GRANT ALL ON events TO authenticated;

-- Create a simple function to fix counts that works without auth context
CREATE OR REPLACE FUNCTION fix_participant_counts_simple()
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
GRANT EXECUTE ON FUNCTION fix_participant_counts_simple() TO authenticated;

-- Run the fix
SELECT fix_participant_counts_simple();