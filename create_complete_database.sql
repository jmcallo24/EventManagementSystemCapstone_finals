-- ===================================================================
-- SCHOOL EVENT MANAGEMENT SYSTEM - SAFE DATABASE UPDATE
-- Run this in your Supabase SQL Editor
-- Updated: January 2025 - FIXED VERSION
-- ===================================================================

-- SAFE COLUMN ADDITIONS (Won't error if already exists)
-- Add missing columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_level VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Add missing columns to existing events table  
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_allocated DECIMAL(10,2) DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add missing columns to existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_request_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- MAIN NEW TABLE - EVENT REQUESTS (This is what you need!)
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
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review', 'cancelled')),
  admin_comments TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_event_id UUID REFERENCES events(id),
  rejection_reason TEXT,
  priority_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- OPTIONAL NEW TABLES (Only if you want venue management)
CREATE TABLE IF NOT EXISTS venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL,
  location VARCHAR(255),
  venue_type VARCHAR(50) CHECK (venue_type IN ('indoor', 'outdoor', 'auditorium', 'classroom', 'gymnasium', 'field')),
  facilities TEXT[],
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  booking_rules TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS venue_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  request_id UUID REFERENCES event_requests(id) ON DELETE SET NULL,
  booked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  purpose TEXT,
  special_requirements TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'waived', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- SAFE INDEXES (Won't error if already exists)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_event_requests_requester ON event_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_date ON event_requests(date);

CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active);
CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(venue_type);

-- SAFE RLS SETUP
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;

-- SAFE POLICIES (Drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users manage own requests" ON event_requests;
CREATE POLICY "Users manage own requests" ON event_requests
  FOR ALL USING (requester_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claim.email', true)));

DROP POLICY IF EXISTS "Public view active venues" ON venues;
CREATE POLICY "Public view active venues" ON venues
  FOR SELECT USING (is_active = true);

-- ADD FOREIGN KEY CONSTRAINT SAFELY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_related_request_id_fkey'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_related_request_id_fkey 
        FOREIGN KEY (related_request_id) REFERENCES event_requests(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===================================================================
-- CLEAN SETUP COMPLETE - NO DUMMY DATA
-- ===================================================================
-- Tables created successfully! 
-- Your calendar will be empty initially (as requested).
-- Ready for real events only! ✅