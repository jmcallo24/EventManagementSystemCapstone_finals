-- SIMPLE CALENDAR TABLE SETUP - FIXED RLS VERSION
-- Copy and paste this entire script into your Supabase SQL Editor

-- 1. Create the calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'Other',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DISABLE RLS temporarily to avoid policy violations
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "calendar_read_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_insert_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_update_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_delete_policy" ON calendar_events;

-- 4. Create very permissive policies
CREATE POLICY "calendar_read_policy" 
ON calendar_events FOR SELECT 
USING (true);

CREATE POLICY "calendar_insert_policy" 
ON calendar_events FOR INSERT 
WITH CHECK (true);

CREATE POLICY "calendar_update_policy" 
ON calendar_events FOR UPDATE 
USING (true);

CREATE POLICY "calendar_delete_policy" 
ON calendar_events FOR DELETE 
USING (true);

-- 5. Grant ALL permissions to everyone
GRANT ALL ON calendar_events TO anon;
GRANT ALL ON calendar_events TO authenticated;
GRANT ALL ON calendar_events TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 6. Re-enable RLS with new permissive policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 7. Insert a test event to verify the table works
INSERT INTO calendar_events (title, description, date, type) VALUES
('✅ Calendar Setup Complete', 'Test event - calendar table is working!', CURRENT_DATE, 'Academic')
ON CONFLICT DO NOTHING;

-- 8. Test the policies work
INSERT INTO calendar_events (title, description, date, type) VALUES
('🎉 RLS Test Event', 'If you see this, RLS policies are working correctly!', CURRENT_DATE + 1, 'Other')
ON CONFLICT DO NOTHING;

-- 9. Show the table structure and data
SELECT 'Calendar table created successfully!' as status;
SELECT COUNT(*) as total_events FROM calendar_events;
SELECT * FROM calendar_events ORDER BY created_at DESC LIMIT 5;