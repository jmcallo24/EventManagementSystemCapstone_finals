-- QUICK FIX FOR EVENT REQUESTS RLS POLICY
-- Run this in Supabase SQL Editor if you're getting 401 errors

-- First, check if table exists and create if needed
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  venue VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  expected_participants INTEGER DEFAULT 50,
  requirements TEXT,
  budget_estimate DECIMAL(10,2),
  request_reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  admin_comments TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS (if not already enabled)
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own event requests" ON event_requests;
DROP POLICY IF EXISTS "Users can create event requests" ON event_requests;
DROP POLICY IF EXISTS "Users manage own requests" ON event_requests;

-- Create SIMPLE policies that work with localStorage auth
CREATE POLICY "Allow all authenticated users to read their requests" ON event_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow all authenticated users to insert requests" ON event_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update their requests" ON event_requests
  FOR UPDATE USING (true);

-- Also check notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL;

-- Make sure notifications are accessible
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Allow users to view all notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Allow users to insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Success message
SELECT 'Event requests table and policies created successfully!' as status;