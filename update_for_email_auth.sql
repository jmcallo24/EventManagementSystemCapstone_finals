-- Update event_requests table to work with email-based authentication
-- This will modify the table to support both UUID and email-based user identification

-- First, let's add the email-based columns we need
ALTER TABLE event_requests 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Update the requester_id constraint to be nullable (for email-based auth)
ALTER TABLE event_requests 
ALTER COLUMN requester_id DROP NOT NULL;

-- Create an index for email-based queries
CREATE INDEX IF NOT EXISTS idx_event_requests_user_email ON event_requests(user_email);

-- Update notifications table to also support email-based identification
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);

-- Create an index for notifications email queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);

-- Ensure backward compatibility by allowing both UUID and email identification
-- This way the system can work with both authentication methods

SELECT 'Database updated successfully for email-based authentication' as result;