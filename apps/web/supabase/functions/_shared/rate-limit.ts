// In-memory rate limiter for Edge Functions
// Prevents API abuse, brute force attacks, and DOS

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory store for rate limiting
// Note: This resets when the Edge Function cold starts
// For production, consider using Upstash Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
export const RATE_LIMITS = {
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  API_KEY_GENERATION: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  FILE_UPLOAD: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Checks if a request should be rate limited
 * Returns allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No entry or window expired - create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Rate limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Creates a rate limit identifier from request
 * Uses IP address + user ID for authenticated requests
 */
export function getRateLimitIdentifier(req: Request, userId?: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Creates a 429 Too Many Requests response
 */
export function createRateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
      },
    }
  );
}

/**
 * Cleans up expired entries from the rate limit store
 * Call this periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);