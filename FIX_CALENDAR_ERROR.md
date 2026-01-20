# 🔧 Fix Calendar Database Error

## The Problem
You're getting "could not find table public.calendar_events" because the table doesn't exist in your Supabase database.

## Quick Fix (5 minutes)

### Step 1: Go to Supabase
1. Open your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar

### Step 2: Run This SQL Script
Copy and paste this ENTIRE script into the SQL Editor:

```sql
-- SIMPLE CALENDAR TABLE SETUP
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

-- 2. Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "calendar_read_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_insert_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_update_policy" ON calendar_events;
DROP POLICY IF EXISTS "calendar_delete_policy" ON calendar_events;

-- 4. Create simple policies for all authenticated users
CREATE POLICY "calendar_read_policy" 
ON calendar_events FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "calendar_insert_policy" 
ON calendar_events FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "calendar_update_policy" 
ON calendar_events FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "calendar_delete_policy" 
ON calendar_events FOR DELETE 
TO authenticated 
USING (true);

-- 5. Grant permissions
GRANT ALL ON calendar_events TO authenticated;

-- 6. Insert a test event to verify the table works
INSERT INTO calendar_events (title, description, date, type) VALUES
('✅ Calendar Setup Complete', 'Test event - calendar table is working!', CURRENT_DATE, 'Academic')
ON CONFLICT DO NOTHING;

-- 7. Show the table structure and data
SELECT 'Calendar table created successfully!' as status;
SELECT * FROM calendar_events LIMIT 5;
```

### Step 3: Click "Run"
Click the "Run" button in Supabase SQL Editor

### Step 4: Verify Success
You should see output like:
- "Calendar table created successfully!"
- A test event in the results

### Step 5: Test in Your App
1. Go back to your calendar page
2. Click the "Test DB" button
3. Should show "✅ Database OK"
4. Try adding an event - should work now!

## What This Fixes:
✅ Creates the `calendar_events` table  
✅ Sets up proper permissions  
✅ Allows all users to add/edit/delete calendar events  
✅ Adds a test event to verify it works  

## After Setup:
- **View**: See all 31 fixed school events + your custom events
- **Add**: Click "Add Event" to create custom events  
- **Edit**: Click on any custom event to edit (school events are protected)
- **Delete**: Remove custom events you created
- **Refresh**: "Refresh" button reloads from database
- **Test**: "Test DB" button checks if database is working

The school calendar events (31 total) are hardcoded and will always show, but your custom events need the database table to work.