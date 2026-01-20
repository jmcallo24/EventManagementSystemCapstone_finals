-- QUICK FIX - Add missing event_requests table only
-- Run this if you just need the event_requests table

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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_event_requests_requester ON event_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);

-- Enable RLS
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view their own event requests" ON event_requests
  FOR SELECT USING (requester_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

CREATE POLICY "Users can create event requests" ON event_requests
  FOR INSERT WITH CHECK (requester_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

-- Update notifications to support request notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL;