-- ===================================================================
-- EVENT REGISTRATION SYSTEM - Add Participant Tracking
-- Run this in your Supabase SQL Editor
-- ===================================================================

-- Create event_registrations table for tracking participants
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  attendance_status VARCHAR(20) DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'absent', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, participant_id) -- Prevent duplicate registrations
);

-- Fix missing columns if they don't exist (SAFE OPERATION)
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'registered';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraint for attendance_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_registrations_attendance_status_check' 
    AND table_name = 'event_registrations'
  ) THEN
    ALTER TABLE event_registrations 
    ADD CONSTRAINT event_registrations_attendance_status_check 
    CHECK (attendance_status IN ('registered', 'attended', 'absent', 'cancelled'));
  END IF;
END
$$;

-- Create favorites table for users to favorite events
CREATE TABLE IF NOT EXISTS event_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id) -- Prevent duplicate favorites
);

-- Add participant count trigger to automatically update current_participants
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increase participant count when someone registers
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_id = NEW.event_id 
      AND COALESCE(attendance_status, 'registered') = 'registered'
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease participant count when someone unregisters
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_id = OLD.event_id 
      AND COALESCE(attendance_status, 'registered') = 'registered'
    )
    WHERE id = OLD.event_id;
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update count when attendance status changes
    UPDATE events 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM event_registrations 
      WHERE event_id = NEW.event_id 
      AND COALESCE(attendance_status, 'registered') = 'registered'
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic participant counting
DROP TRIGGER IF EXISTS trigger_update_participant_count ON event_registrations;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participant_count();

-- Enable RLS (Row Level Security) for event_registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own registrations
CREATE POLICY "Users can view own registrations" ON event_registrations
  FOR SELECT USING (participant_id = auth.uid());

-- RLS Policy: Users can register themselves for events
CREATE POLICY "Users can register for events" ON event_registrations
  FOR INSERT WITH CHECK (participant_id = auth.uid());

-- RLS Policy: Users can update their own registrations
CREATE POLICY "Users can update own registrations" ON event_registrations
  FOR UPDATE USING (participant_id = auth.uid());

-- RLS Policy: Users can delete their own registrations
CREATE POLICY "Users can delete own registrations" ON event_registrations
  FOR DELETE USING (participant_id = auth.uid());

-- RLS Policy: Admins and organizers can see all registrations
CREATE POLICY "Admins can view all registrations" ON event_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'organizer')
    )
  );

-- Enable RLS for event_favorites
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON event_favorites
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_participant_id ON event_registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(attendance_status);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_user_id ON event_favorites(user_id);

-- Insert some sample data to test (OPTIONAL - remove if you don't want dummy data)
-- This will only insert if the tables are empty
INSERT INTO event_registrations (event_id, participant_id, attendance_status)
SELECT 
  e.id as event_id,
  u.id as participant_id,
  'registered' as attendance_status
FROM events e
CROSS JOIN users u
WHERE u.role = 'participant'
AND e.status = 'approved'
AND NOT EXISTS (SELECT 1 FROM event_registrations) -- Only if table is empty
LIMIT 10; -- Limit to prevent too many registrations

-- Refresh participant counts for existing events
UPDATE events 
SET current_participants = (
  SELECT COALESCE(COUNT(*), 0)
  FROM event_registrations 
  WHERE event_id = events.id 
  AND COALESCE(attendance_status, 'registered') = 'registered'
)
WHERE status = 'approved';

-- Success message
SELECT 'Event registration system created successfully!' as status;