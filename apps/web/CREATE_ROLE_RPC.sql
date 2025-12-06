-- Create an RPC function to insert roles
-- This bypasses the Supabase JS client which seems to be hanging

CREATE OR REPLACE FUNCTION create_role_rpc(
  p_user_id UUID,
  p_title TEXT,
  p_department TEXT,
  p_location TEXT,
  p_employment_type TEXT,
  p_salary_min NUMERIC DEFAULT NULL,
  p_salary_max NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT,
  description TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO roles (
    user_id,
    title,
    department,
    location,
    employment_type,
    salary_min,
    salary_max,
    description,
    is_active
  ) VALUES (
    p_user_id,
    p_title,
    p_department,
    p_location,
    p_employment_type,
    p_salary_min,
    p_salary_max,
    p_description,
    true
  )
  RETURNING *;
END;
$$;
