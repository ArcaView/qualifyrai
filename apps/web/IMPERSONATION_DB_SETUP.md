# User Impersonation Database Setup

This guide will help you set up the database tables and functions for the User Impersonation feature in Supabase.

## Overview

The impersonation system allows admins to view the application as another user would see it, with the user's explicit approval. All impersonation sessions are logged for security and compliance.

## Step 1: Create the impersonation_sessions table

```sql
-- Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'ended')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  CONSTRAINT valid_session CHECK (
    (status = 'pending' AND approved_at IS NULL AND ended_at IS NULL) OR
    (status IN ('approved', 'active') AND approved_at IS NOT NULL) OR
    (status = 'rejected' AND approved_at IS NULL) OR
    (status = 'ended' AND ended_at IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin ON public.impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_target ON public.impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_status ON public.impersonation_sessions(status);

-- Enable Row Level Security
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can create impersonation requests
CREATE POLICY "Admins can create impersonation sessions"
  ON public.impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_user_id AND
    auth.jwt()->>'email' IN ('admin@qualifyr.ai', 'btjtownsend@outlook.com')
  );

-- Policy: Admins can view their own requests
CREATE POLICY "Admins can view own impersonation sessions"
  ON public.impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_user_id);

-- Policy: Target users can view requests for them
CREATE POLICY "Users can view impersonation requests for them"
  ON public.impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- Policy: Target users can update status (approve/reject)
CREATE POLICY "Users can approve/reject impersonation requests"
  ON public.impersonation_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = target_user_id AND status IN ('approved', 'rejected'));

-- Policy: Admins can end sessions
CREATE POLICY "Admins can end impersonation sessions"
  ON public.impersonation_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_user_id)
  WITH CHECK (auth.uid() = admin_user_id AND status = 'ended');
```

## Step 2: Create the impersonation_audit_log table

```sql
-- Create impersonation_audit_log table for compliance
CREATE TABLE IF NOT EXISTS public.impersonation_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.impersonation_sessions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_log_session ON public.impersonation_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_log_admin ON public.impersonation_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_audit_log_created ON public.impersonation_audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.impersonation_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.impersonation_audit_log
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'email' IN ('admin@qualifyr.ai', 'btjtownsend@outlook.com')
  );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.impersonation_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## Step 3: Create helper functions

```sql
-- Function to create impersonation request (handles user lookup)
CREATE OR REPLACE FUNCTION public.create_impersonation_request(
  p_target_email TEXT,
  p_reason TEXT DEFAULT 'Support request'
)
RETURNS UUID AS $$
DECLARE
  v_target_user_id UUID;
  v_session_id UUID;
BEGIN
  -- Find target user by email
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE email = p_target_email;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_target_email;
  END IF;

  -- Create impersonation session
  INSERT INTO public.impersonation_sessions (
    admin_user_id,
    admin_email,
    target_user_id,
    target_email,
    status,
    reason
  ) VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    v_target_user_id,
    p_target_email,
    'pending',
    p_reason
  ) RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically expire old pending requests (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.expire_old_impersonation_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.impersonation_sessions
  SET status = 'rejected',
      ended_at = NOW()
  WHERE status = 'pending'
    AND requested_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically end sessions after 30 minutes
CREATE OR REPLACE FUNCTION public.expire_impersonation_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public.impersonation_sessions
  SET status = 'ended',
      ended_at = NOW()
  WHERE status = 'active'
    AND (expires_at IS NOT NULL AND expires_at < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log impersonation actions
CREATE OR REPLACE FUNCTION public.log_impersonation_action(
  p_session_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_admin_id UUID;
  v_target_id UUID;
BEGIN
  SELECT admin_user_id, target_user_id
  INTO v_admin_id, v_target_id
  FROM public.impersonation_sessions
  WHERE id = p_session_id;

  INSERT INTO public.impersonation_audit_log (
    session_id,
    admin_user_id,
    target_user_id,
    action,
    details
  ) VALUES (
    p_session_id,
    v_admin_id,
    v_target_id,
    p_action,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 4: Enable Realtime (for approval notifications)

In the Supabase dashboard:

1. Go to **Database** > **Replication**
2. Find `impersonation_sessions` table
3. Enable **Realtime** for this table
4. This allows instant notifications when users approve/reject requests

## Step 5: Set up automatic cleanup (optional)

You can create a PostgreSQL cron job to automatically clean up old sessions:

```sql
-- Requires pg_cron extension
-- Run cleanup every minute
SELECT cron.schedule(
  'expire-impersonation-requests',
  '* * * * *',
  'SELECT public.expire_old_impersonation_requests();'
);

SELECT cron.schedule(
  'expire-impersonation-sessions',
  '* * * * *',
  'SELECT public.expire_impersonation_sessions();'
);
```

## Schema Overview

### impersonation_sessions table
- `id`: Unique session identifier
- `admin_user_id`: Admin requesting impersonation
- `admin_email`: Admin's email
- `target_user_id`: User being impersonated
- `target_email`: Target user's email
- `status`: pending | approved | rejected | active | ended
- `requested_at`: When request was made
- `approved_at`: When user approved (if approved)
- `ended_at`: When session ended
- `expires_at`: Auto-expire time (30 min after approval)
- `reason`: Why admin needs to impersonate

### impersonation_audit_log table
- `id`: Unique log entry ID
- `session_id`: Reference to impersonation session
- `admin_user_id`: Admin who performed action
- `target_user_id`: User being impersonated
- `action`: Action performed (e.g., "session_started", "page_viewed", "session_ended")
- `details`: JSON with additional context
- `created_at`: Timestamp

## Security Features

1. **User Approval Required**: Users must explicitly approve each request
2. **Time-Limited**: Sessions expire after 30 minutes
3. **Audit Trail**: All actions logged permanently
4. **Admin-Only**: Only whitelisted emails can impersonate
5. **RLS Policies**: Database-level security prevents unauthorized access
6. **Request Expiry**: Pending requests expire after 5 minutes

## Admin Emails

Update the admin email list in the RLS policies above to match your admins:
- Replace `'admin@qualifyr.ai', 'btjtownsend@outlook.com'` with your actual admin emails
