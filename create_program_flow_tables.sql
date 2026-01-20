-- Create Program Flows table
CREATE TABLE IF NOT EXISTS program_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  event_date DATE NOT NULL,
  organizer_id UUID NOT NULL,
  organizer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  admin_comments TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Program Flow Activities table
CREATE TABLE IF NOT EXISTS program_flow_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_flow_id UUID REFERENCES program_flows(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  duration INTEGER DEFAULT 60, -- in minutes
  activity_type TEXT DEFAULT 'activity' CHECK (activity_type IN ('opening', 'presentation', 'activity', 'break', 'closing', 'other')),
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_program_flows_organizer_id ON program_flows(organizer_id);
CREATE INDEX IF NOT EXISTS idx_program_flows_event_id ON program_flows(event_id);
CREATE INDEX IF NOT EXISTS idx_program_flows_status ON program_flows(status);
CREATE INDEX IF NOT EXISTS idx_program_flow_activities_flow_id ON program_flow_activities(program_flow_id);
CREATE INDEX IF NOT EXISTS idx_program_flow_activities_order ON program_flow_activities(program_flow_id, order_index);

-- Enable Row Level Security
ALTER TABLE program_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_flow_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for program_flows
CREATE POLICY "Enable read access for all users" ON program_flows FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON program_flows FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON program_flows FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON program_flows FOR DELETE USING (true);

-- Create RLS policies for program_flow_activities  
CREATE POLICY "Enable read access for all users" ON program_flow_activities FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON program_flow_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON program_flow_activities FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON program_flow_activities FOR DELETE USING (true);

-- Insert sample data
INSERT INTO program_flows (
  event_id,
  event_title,
  event_date,
  organizer_id,
  organizer_name,
  title,
  description,
  status
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'Sample Event',
  '2025-10-15',
  '00000000-0000-0000-0000-000000000000',
  'Event Organizer',
  'Sports Festival Program Flow',
  'Complete program flow for the annual sports festival event',
  'draft'
);

-- Get the program flow ID for sample activities
DO $$
DECLARE
    flow_id UUID;
BEGIN
    SELECT id INTO flow_id FROM program_flows WHERE title = 'Sports Festival Program Flow' LIMIT 1;
    
    -- Insert sample activities
    INSERT INTO program_flow_activities (
      program_flow_id,
      time,
      title,
      description,
      location,
      duration,
      activity_type,
      order_index
    ) VALUES 
    (flow_id, '08:00', 'Registration & Breakfast', 'Participant registration and welcome breakfast', 'Main Lobby', 60, 'opening', 0),
    (flow_id, '09:00', 'Opening Ceremony', 'Welcome remarks and event overview', 'Main Stadium', 30, 'opening', 1),
    (flow_id, '09:30', 'Team Building Activities', 'Ice breaker games and team formation', 'Activity Area 1', 90, 'activity', 2),
    (flow_id, '11:00', 'Sports Competition Round 1', 'Basketball, Volleyball, Track & Field events', 'Sports Complex', 120, 'activity', 3),
    (flow_id, '13:00', 'Lunch Break', 'Lunch and rest period', 'Cafeteria', 60, 'break', 4),
    (flow_id, '14:00', 'Sports Competition Round 2', 'Swimming, Tennis, Football events', 'Sports Complex', 120, 'activity', 5),
    (flow_id, '16:00', 'Awards Ceremony', 'Recognition and prizes for winners', 'Main Stadium', 45, 'closing', 6),
    (flow_id, '16:45', 'Closing Remarks', 'Thank you and event wrap-up', 'Main Stadium', 15, 'closing', 7);
END $$;