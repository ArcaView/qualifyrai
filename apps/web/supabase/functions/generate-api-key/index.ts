// Supabase Edge Function: Generate API Key
// Purpose: Securely generate and store hashed API keys for users
// Deploy: supabase functions deploy generate-api-key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getRateLimitIdentifier, createRateLimitResponse, RATE_LIMITS } from "../_shared/rate-limit.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Rate limiting - 10 API key generations per hour per user
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.API_KEY_GENERATION);
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    // Parse request body for optional key name
    const { name } = await req.json().catch(() => ({ name: 'API Key' }));

    // Generate cryptographically secure API key
    // Format: qfy_live_<32-char-random-string>
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const randomString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const apiKey = `qfy_live_${randomString}`;
    const keyPrefix = apiKey.substring(0, 12); // First 12 chars for display

    // Hash the API key using bcrypt
    const salt = await bcrypt.genSalt(10);
    const keyHash = await bcrypt.hash(apiKey, salt);

    // Store hashed key in database
    const { data, error } = await supabaseClient
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: name || 'API Key',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to store API key: ${error.message}`);
    }

    // Return the plain API key ONCE (never stored in plain text)
    // Also return the database record (without hash)
    return new Response(
      JSON.stringify({
        success: true,
        apiKey: apiKey, // ONLY TIME this is returned in plain text
        keyData: {
          id: data.id,
          name: data.name,
          key_prefix: keyPrefix,
          created_at: data.created_at,
          is_active: data.is_active,
        },
        message: 'API key generated successfully. Save this key now - it will not be shown again.',
        rateLimitRemaining: rateLimit.remaining,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});