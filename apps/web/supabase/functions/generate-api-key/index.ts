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
    // Get authorization header and extract JWT token
    const authHeader = req.headers.get('Authorization');
    console.log('[Edge Function] Auth header present:', !!authHeader);
    console.log('[Edge Function] Auth header (first 30 chars):', authHeader?.substring(0, 30) + '...');

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract the JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    console.log('[Edge Function] Extracted token (first 20 chars):', token.substring(0, 20) + '...');

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('[Edge Function] SUPABASE_URL:', supabaseUrl);
    console.log('[Edge Function] SUPABASE_ANON_KEY present:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(`Missing environment variables: URL=${!!supabaseUrl}, AnonKey=${!!supabaseAnonKey}`);
    }

    // Create Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    console.log('[Edge Function] Supabase client created, calling getUser() with token');

    // Get authenticated user - IMPORTANT: Pass the token explicitly
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    console.log('[Edge Function] getUser() result - user:', !!user, 'error:', userError);

    if (userError || !user) {
      console.error('[Edge Function] Auth error details:', JSON.stringify(userError, null, 2));
      throw new Error(`User not authenticated: ${userError?.message || 'Invalid token'}`);
    }

    console.log('[Edge Function] User authenticated successfully:', user.id);

    // Rate limiting - 10 API key generations per hour per user
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.API_KEY_GENERATION);
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    // Parse request body for optional key name
    const body = await req.json().catch(() => ({ name: 'API Key' }));

    // Validate and sanitize name input
    let sanitizedName = 'API Key';
    if (body.name) {
      // Validate type
      if (typeof body.name !== 'string') {
        throw new Error('Invalid name parameter: must be a string');
      }

      // Sanitize: remove HTML tags, trim whitespace, limit length
      sanitizedName = body.name
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .replace(/[<>'"]/g, '')   // Remove potentially dangerous characters
        .trim()
        .substring(0, 50);        // Limit to 50 characters

      // Use default if empty after sanitization
      if (!sanitizedName) {
        sanitizedName = 'API Key';
      }
    }

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
        name: sanitizedName,
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