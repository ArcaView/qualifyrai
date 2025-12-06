-- Fixed: Create a database function to insert roles
-- Matches all columns from the roles table
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.create_role(
  p_title TEXT,
  p_department TEXT,
  p_location TEXT,
  p_employment_type TEXT,
  p_salary_min DECIMAL,
  p_salary_max DECIMAL,
  p_description TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  department TEXT,
  location TEXT,
  employment_type TEXT,
  salary_min DECIMAL,
  salary_max DECIMAL,
  salary_currency TEXT,
  description TEXT,
  requirements JSONB,
  preferred_qualifications JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.roles (
    user_id,
    title,
    department,
    location,
    employment_type,
    salary_min,
    salary_max,
    description,
    is_active
  )
  VALUES (
    auth.uid(),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_role TO authenticated;
