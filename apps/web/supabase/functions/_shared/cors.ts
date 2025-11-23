// Centralized CORS configuration for Edge Functions
// Restricts CORS to specific allowed domains (fixes wildcard vulnerability)

const ALLOWED_ORIGINS = [
  'https://qualifyrai.com',
  'https://www.qualifyrai.com',
  // Add localhost for development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
];

/**
 * Check if origin is a local/development origin
 */
function isLocalOrigin(origin: string): boolean {
  return origin.includes('localhost') ||
         origin.includes('127.0.0.1') ||
         origin.match(/http:\/\/192\.168\.\d+\.\d+:\d+/) !== null ||
         origin.match(/http:\/\/10\.\d+\.\d+\.\d+:\d+/) !== null;
}

/**
 * Gets CORS headers with proper origin restriction
 * Only allows requests from whitelisted domains
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  // In development, allow local origins
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    isLocalOrigin(origin)
  );

  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

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