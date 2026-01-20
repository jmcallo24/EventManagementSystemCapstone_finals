-- Create calendar_events table with proper permissions
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

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to read calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Allow authenticated users to insert calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Allow users to update their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Allow users to delete their own calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Allow admin users full access to calendar events" ON calendar_events;

-- Allow all authenticated users to read calendar events
CREATE POLICY "Allow authenticated users to read calendar events" 
ON calendar_events FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to insert calendar events
CREATE POLICY "Allow authenticated users to insert calendar events" 
ON calendar_events FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to update their own calendar events OR admin users
CREATE POLICY "Allow users to update their own calendar events" 
ON calendar_events FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Allow users to delete their own calendar events OR admin users
CREATE POLICY "Allow users to delete their own calendar events" 
ON calendar_events FOR DELETE 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Grant necessary permissions
GRANT ALL ON calendar_events TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test the table by inserting a sample event
INSERT INTO calendar_events (title, description, date, type, created_by) VALUES
('Sample Calendar Event', 'This is a test event to verify the table works', '2025-10-15', 'Academic', 
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Show the structure
\d calendar_events;