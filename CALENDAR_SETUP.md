# 📅 Calendar Database Setup

## Quick Fix for Calendar Issues

If you're getting "Failed to save event" errors, run this SQL script in your Supabase SQL Editor:

```sql
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

-- Allow users to update/delete their own events OR admin users can modify any
CREATE POLICY "Allow users to update their own calendar events" 
ON calendar_events FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Allow users to delete their own calendar events" 
ON calendar_events FOR DELETE 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);
```

## What This Fixes:

✅ **Add Events** - Users can now add custom events to the calendar
✅ **Edit Events** - Click on custom events to edit them (school events are protected)
✅ **Delete Events** - Remove custom events (school events cannot be deleted)
✅ **View Events** - See both fixed school calendar events + custom events
✅ **Permission Control** - Admins can modify any event, users can only modify their own

## Calendar Features:

### Fixed School Events (31 events):
- 📚 Academic events (Brigada Eskwela, INSET, etc.)
- 🏃 Sports events (Intramurals, Sports Fest)
- 🎭 Cultural events (Foundation Day, Arts Month)
- 🔬 Research activities
- 📝 Examination periods
- 🎉 Holiday celebrations

### Custom Events:
- ➕ Add your own events
- ✏️ Edit event details
- 🗑️ Delete events you created
- 🎨 Different colors by type

### Event Types Available:
- Academic (Blue)
- Sports (Green) 
- Cultural (Pink)
- Research (Purple)
- Examination (Red)
- Holiday (Orange)
- Other (Violet)

After running the SQL script, refresh your calendar page and try adding an event again!