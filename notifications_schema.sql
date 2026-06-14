-- notifications_schema.sql

-- 1. Create admin_messages table to store history
CREATE TABLE IF NOT EXISTS admin_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create notifications table for student inbox
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add new columns if the notifications table already existed from a previous mock setup
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES admin_messages(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Low';

-- 3. Trigger to distribute messages to all students
CREATE OR REPLACE FUNCTION distribute_admin_message()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  -- Insert a copy for every user with role 'student' in the profiles table
  INSERT INTO notifications (user_id, message_id, title, message, priority)
  SELECT id, NEW.id, NEW.title, NEW.message, NEW.priority
  FROM profiles
  WHERE role = 'student';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_admin_message_insert ON admin_messages;
CREATE TRIGGER on_admin_message_insert
AFTER INSERT ON admin_messages
FOR EACH ROW EXECUTE FUNCTION distribute_admin_message();

-- 4. Enable RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for admin_messages
-- Admins can read, insert, delete admin messages
DROP POLICY IF EXISTS "Admins can manage admin_messages" ON admin_messages;
CREATE POLICY "Admins can manage admin_messages"
    ON admin_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 6. RLS Policies for notifications
-- Students can read and update their own notifications
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
CREATE POLICY "Users can manage their own notifications"
    ON notifications
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Enable Supabase Realtime for the notifications table
-- (Already added in previous run. Uncomment if running on a fresh database)
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 8. Grant privileges to roles
GRANT ALL ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO anon;
GRANT ALL ON public.admin_messages TO service_role;

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO service_role;
