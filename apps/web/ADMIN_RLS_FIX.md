# Admin RLS Policy Fix

The status changes aren't persisting because Row Level Security (RLS) policies don't allow updates to feature requests except by the original creator.

## Solution: Add Admin Update Policy

Run this SQL in your Supabase SQL Editor to allow status updates:

```sql
-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update own feature requests" ON public.feature_requests;

-- Create a more permissive policy that allows authenticated users to update status
-- (You can restrict this further by checking specific admin emails in a custom function)
CREATE POLICY "Authenticated users can update feature requests"
  ON public.feature_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## Alternative: More Secure Admin-Only Policy

If you want to restrict status updates to specific admin emails, use this approach:

```sql
-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's email is in the admin list
  RETURN (
    SELECT email FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('admin@qualifyr.ai', 'your@email.com')
  ) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own feature requests" ON public.feature_requests;

-- Policy: Users can update their own requests OR admins can update any request
CREATE POLICY "Users and admins can update feature requests"
  ON public.feature_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
```

## Quick Fix (Recommended for Now)

For immediate testing, use the first approach (allows all authenticated users to update). You can tighten security later with the admin function.

**Important:** Don't forget to update the admin email in the `is_admin()` function to match your email!
