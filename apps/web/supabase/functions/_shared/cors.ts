// Centralized CORS configuration for Edge Functions
// Restricts CORS to specific allowed domains (fixes wildcard vulnerability)

const ALLOWED_ORIGINS = [
  'https://qualifyrai.com',
  'https://www.qualifyrai.com',
  // Add localhost for development
  ...(Deno.env.get('ENVIRONMENT') === 'development'
    ? ['http://localhost:5173', 'http://localhost:3000']
    : []),
];

/**
 * Gets CORS headers with proper origin restriction
 * Only allows requests from whitelisted domains
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  // Check if origin is allowed, otherwise use first allowed origin as fallback
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Handles CORS preflight OPTIONS requests
 */
export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  return new Response('ok', { headers: corsHeaders });
}