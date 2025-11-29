-- Insert the DEV_API_KEY directly into the database
-- This bypasses any connection issues with the pooler

-- First, calculate the hash of the API key
-- Key: ps_6Ed0hRDV8u97w-ot-wt3N1UPTneLqGDPSx7hAuivIzE
-- SHA256 hash: f3dca2ab6f2925e0a79c80ce94ba627af32374b9877c870deabb725dfc5e0402

INSERT INTO ps_api_keys (id, key_hash, name, created_at, is_active)
VALUES (
  'a2793c48-7340-48bb-bce2-208d0399d59a',
  'f3dca2ab6f2925e0a79c80ce94ba627af32374b9877c870deabb725dfc5e0402',
  'Development Key',
  NOW(),
  1
)
ON CONFLICT (key_hash) DO UPDATE SET
  is_active = 1,
  name = 'Development Key';

-- Verify it was inserted
SELECT id, name, key_hash, is_active, created_at
FROM ps_api_keys
WHERE key_hash = 'f3dca2ab6f2925e0a79c80ce94ba627af32374b9877c870deabb725dfc5e0402';
