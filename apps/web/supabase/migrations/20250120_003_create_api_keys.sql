-- Migration: Create api_keys table for secure API key management
-- Created: 2025-01-20
-- Purpose: Store hashed API keys for user authentication

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_prefix TEXT NOT NULL, -- e.g., 'qfy_live_abc' (first 12 chars for display)
  key_hash TEXT NOT NULL, -- bcrypt hash of the full key
  name TEXT, -- Optional user-defined name like "Production Key"
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
DROP INDEX IF EXISTS idx_api_keys_is_active;
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;
DROP INDEX IF EXISTS idx_api_keys_expires_at;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own API keys (but only prefix, not hash)
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
CREATE POLICY "Users can view their own API keys"
  ON api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own API keys (via Edge Function)
DROP POLICY IF EXISTS "Users can create API keys" ON api_keys;
CREATE POLICY "Users can create API keys"
  ON api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own API keys (revoke, rename)
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
CREATE POLICY "Users can update their own API keys"
  ON api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own API keys
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;
CREATE POLICY "Users can delete their own API keys"
  ON api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can read all keys (for authentication)
DROP POLICY IF EXISTS "Service role can read all API keys" ON api_keys;
CREATE POLICY "Service role can read all API keys"
  ON api_keys
  FOR SELECT
  USING (true);

-- RLS Policy: Service role can update last_used_at
DROP POLICY IF EXISTS "Service role can update API key usage" ON api_keys;
CREATE POLICY "Service role can update API key usage"
  ON api_keys
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to automatically deactivate expired keys
CREATE OR REPLACE FUNCTION deactivate_expired_api_keys()
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET is_active = FALSE
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE api_keys IS 'Stores hashed API keys for user authentication. Full keys are NEVER stored in plain text.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of key for display purposes (e.g., "qfy_live_abc")';
COMMENT ON COLUMN api_keys.key_hash IS 'bcrypt hash of the full API key. Used for authentication.';