-- Fix Report Communication System
-- This ensures proper two-way communication between organizations and admins

-- 1. Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('rejection_complaint', 'technical_issue', 'general_inquiry', 'event_feedback')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    related_event_id UUID REFERENCES events(id) ON DELETE SET NULL
);

-- 2. Create report_messages table for two-way communication
CREATE TABLE IF NOT EXISTS report_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on both tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for reports
-- Users can see their own reports, admins can see all reports
CREATE POLICY "Users can view their own reports" ON reports
    FOR SELECT USING (
        auth.uid() = reporter_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create their own reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Create RLS policies for report_messages
-- Users can see messages from their own reports, admins can see all messages
CREATE POLICY "Users can view messages from their reports" ON report_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM reports WHERE id = report_id AND reporter_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users and admins can create messages" ON report_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND (
            EXISTS (SELECT 1 FROM reports WHERE id = report_id AND reporter_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    );

-- 6. Create function to handle admin responses with notifications
CREATE OR REPLACE FUNCTION handle_admin_report_response(
    p_report_id UUID,
    p_admin_id UUID,
    p_message TEXT,
    p_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_report_title TEXT;
    v_reporter_id UUID;
    v_admin_name TEXT;
BEGIN
    -- Verify admin role
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
        RETURN json_build_object('success', false, 'message', 'Only admins can respond to reports');
    END IF;

    -- Get report details
    SELECT title, reporter_id INTO v_report_title, v_reporter_id
    FROM reports WHERE id = p_report_id;

    IF v_reporter_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Report not found');
    END IF;

    -- Get admin name
    SELECT COALESCE(name, email) INTO v_admin_name
    FROM users WHERE id = p_admin_id;

    -- Add admin message
    INSERT INTO report_messages (report_id, sender_id, message)
    VALUES (p_report_id, p_admin_id, p_message);

    -- Update report status if provided
    IF p_status IS NOT NULL THEN
        UPDATE reports 
        SET status = p_status, admin_response = p_message, updated_at = NOW()
        WHERE id = p_report_id;
    END IF;

    -- Create notification for the reporter
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
        v_reporter_id,
        '💬 Admin Response to Your Report',
        format('Admin %s responded to your report "%s": %s', 
               COALESCE(v_admin_name, 'Administrator'), 
               v_report_title, 
               CASE WHEN length(p_message) > 100 THEN left(p_message, 100) || '...' ELSE p_message END),
        'report_response',
        false
    );

    RETURN json_build_object(
        'success', true, 
        'message', 'Response sent successfully',
        'report_id', p_report_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false, 
        'message', 'Error: ' || SQLERRM
    );
END;
$$;

-- 7. Create function to auto-notify admins when new reports are created
CREATE OR REPLACE FUNCTION notify_admins_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_record RECORD;
    reporter_name TEXT;
BEGIN
    -- Get reporter name
    SELECT COALESCE(name, email) INTO reporter_name
    FROM users WHERE id = NEW.reporter_id;

    -- Notify all admins
    FOR admin_record IN 
        SELECT id FROM users WHERE role = 'admin'
    LOOP
        INSERT INTO notifications (user_id, title, message, type, is_read)
        VALUES (
            admin_record.id,
            format('📋 New %s Report', replace(NEW.report_type, '_', ' ')),
            format('%s submitted a report: "%s". Please review and respond.',
                   COALESCE(reporter_name, 'User'),
                   NEW.title),
            'new_report',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- 8. Create trigger for auto-notification
DROP TRIGGER IF EXISTS trigger_notify_admins_new_report ON reports;
CREATE TRIGGER trigger_notify_admins_new_report
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_new_report();

-- 9. Grant necessary permissions
GRANT ALL ON reports TO authenticated;
GRANT ALL ON report_messages TO authenticated;
GRANT EXECUTE ON FUNCTION handle_admin_report_response(UUID, UUID, TEXT, TEXT) TO authenticated;

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON report_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_report_messages_created_at ON report_messages(created_at DESC);

-- 11. Show current reports and their status
SELECT 
    r.id,
    r.title,
    r.report_type,
    r.status,
    u.name as reporter_name,
    u.email as reporter_email,
    r.created_at,
    (SELECT COUNT(*) FROM report_messages WHERE report_id = r.id) as message_count
FROM reports r
JOIN users u ON r.reporter_id = u.id
ORDER BY r.created_at DESC
LIMIT 10;