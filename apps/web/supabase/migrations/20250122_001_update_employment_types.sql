-- Update employment type constraint to include all requested types
-- Drop the old constraint
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_employment_type_check;

-- Add new constraint with all employment types
ALTER TABLE roles ADD CONSTRAINT roles_employment_type_check
  CHECK (employment_type = ANY (ARRAY[
    'full-time'::text,
    'part-time'::text,
    'contract'::text,
    'freelance'::text,
    'temporary'::text,
    'internship'::text
  ]));
