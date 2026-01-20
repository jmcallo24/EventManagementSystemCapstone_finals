-- ===================================================================
-- SIMPLE FIX FOR REGISTRATION SYSTEM - Run Step by Step
-- Copy and paste each section one by one in Supabase SQL Editor
-- ===================================================================

-- STEP 1: Check if event_registrations table exists and fix it
SELECT 'Checking event_registrations table...' as step;

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- STEP 2: Add missing columns safely
SELECT 'Adding missing columns...' as step;

ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'registered';
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- STEP 3: Add constraints
SELECT 'Adding constraints...' as step;

-- Add unique constraint
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_participant_id_key;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_event_id_participant_id_key UNIQUE(event_id, participant_id);

-- Add check constraint
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_attendance_status_check;
ALTER TABLE event_registrations ADD CONSTRAINT event_registrations_attendance_status_check CHECK (attendance_status IN ('registered', 'attended', 'absent', 'cancelled'));

-- STEP 4: Create event_favorites table
SELECT 'Creating event_favorites table...' as step;

CREATE TABLE IF NOT EXISTS event_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id)
);

-- STEP 5: Create the trigger function (SAFE VERSION)
SELECT 'Creating trigger function...' as step;

CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
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

-- STEP 6: Create the trigger
SELECT 'Creating trigger...' as step;

DROP TRIGGER IF EXISTS trigger_update_participant_count ON event_registrations;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_participant_count();

-- STEP 7: Set up RLS policies
SELECT 'Setting up RLS policies...' as step;

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can update own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can manage own favorites" ON event_favorites;

-- Create policies
CREATE POLICY "Users can view own registrations" ON event_registrations
  FOR SELECT USING (participant_id = auth.uid());

CREATE POLICY "Users can register for events" ON event_registrations
  FOR INSERT WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Users can update own registrations" ON event_registrations
  FOR UPDATE USING (participant_id = auth.uid());

CREATE POLICY "Users can delete own registrations" ON event_registrations
  FOR DELETE USING (participant_id = auth.uid());

CREATE POLICY "Admins can view all registrations" ON event_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'organizer')
    )
  );

CREATE POLICY "Users can manage own favorites" ON event_favorites
  FOR ALL USING (user_id = auth.uid());

-- STEP 8: Create indexes
SELECT 'Creating indexes...' as step;

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_participant_id ON event_registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(attendance_status);
CREATE INDEX IF NOT EXISTS idx_event_favorites_event_id ON event_favorites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_favorites_user_id ON event_favorites(user_id);

-- STEP 9: Update existing events (FINAL STEP)
SELECT 'Updating participant counts...' as step;

UPDATE events 
SET current_participants = COALESCE((
  SELECT COUNT(*) 
  FROM event_registrations 
  WHERE event_id = events.id 
  AND COALESCE(attendance_status, 'registered') = 'registered'
), 0);

-- SUCCESS MESSAGE
SELECT 'Registration system setup completed successfully!' as result;
SELECT 'You can now test the registration system in your app!' as next_step;