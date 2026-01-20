-- Fix venues RLS and create venues from approved events
-- Run this in Supabase SQL Editor

-- Temporarily disable RLS on venues table
ALTER TABLE venues DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON venues TO authenticated;
GRANT ALL ON venues TO anon;

-- Insert venues from approved events
INSERT INTO venues (name, description, capacity, location, venue_type, facilities, hourly_rate, is_active, image_url)
SELECT DISTINCT
  er.venue as name,
  CONCAT('Venue for "', er.title, '" event') as description,
  COALESCE(er.expected_participants, 50)::integer as capacity,
  er.venue as location,
  'auditorium' as venue_type,
  ARRAY['Audio System', 'Seating', 'Lighting'] as facilities,
  0 as hourly_rate,
  true as is_active,
  null as image_url
FROM event_requests er
WHERE er.status = 'approved' 
  AND er.venue IS NOT NULL 
  AND er.venue != ''
  AND NOT EXISTS (
    SELECT 1 FROM venues v WHERE v.name = er.venue
  );

-- Re-enable RLS with proper policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
DROP POLICY IF EXISTS "Anyone can view active venues" ON venues;
CREATE POLICY "Anyone can view active venues" ON venues
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can insert venues" ON venues;  
CREATE POLICY "Anyone can insert venues" ON venues
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update venues" ON venues;
CREATE POLICY "Anyone can update venues" ON venues
  FOR UPDATE USING (true);

-- Show results
SELECT COUNT(*) as total_venues, 
       COUNT(CASE WHEN is_active THEN 1 END) as active_venues
FROM venues;