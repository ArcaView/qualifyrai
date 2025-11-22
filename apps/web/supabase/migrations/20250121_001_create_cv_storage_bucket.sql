-- Create CV storage bucket with RLS policies
-- Ensures CV files are private and user-isolated

-- Create the 'cvs' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false, -- PRIVATE bucket
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own CVs
CREATE POLICY "Users can upload their own CVs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own CVs
CREATE POLICY "Users can view their own CVs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own CVs
CREATE POLICY "Users can update their own CVs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own CVs
CREATE POLICY "Users can delete their own CVs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cvs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);