-- Simpler RPC function that returns whatever the table has
-- This avoids type mismatch errors

CREATE OR REPLACE FUNCTION create_role_rpc(
  p_user_id UUID,
  p_title TEXT,
  p_department TEXT,
  p_location TEXT,
  p_employment_type TEXT,
  p_salary_min NUMERIC DEFAULT NULL,
  p_salary_max NUMERIC DEFAULT NULL,
  p_salary_currency TEXT DEFAULT '$',
  p_description TEXT DEFAULT NULL
)
RETURNS SETOF roles
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
    salary_currency,
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
    p_salary_currency,
    p_description,
    true
  )
  RETURNING *;
END;
$$;
