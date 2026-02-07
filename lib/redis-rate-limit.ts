// ============================================
// REDIS-BASED RATE LIMITING (PRODUCTION)
// ============================================
// Install: npm install ioredis

import Redis from 'ioredis';

// Redis client instance (lazy initialization)
let redis: Redis | null = null;

/**
 * Initialize Redis client
 * Only call this once during app startup
 */
export function initRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[REDIS] Max retries reached, giving up');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    redis.on('error', (err) => {
      console.error('[REDIS] Connection error:', err);
    });

    redis.on('connect', () => {
      console.log('[REDIS] Connected successfully');
    });
  }

  return redis;
}

/**
 * Check rate limit using Redis (sliding window)
 * @param identifier Unique identifier (userId, IP, endpoint combination)
 * @param maxRequests Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns true if request is allowed, false if rate limit exceeded
 */
export async function checkRateLimitRedis(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  // Fallback to in-memory if Redis not available
  if (!redis || redis.status !== 'ready') {
    console.warn('[RATE_LIMIT] Redis not available, allowing request');
    return true;
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // 1. Remove old entries outside the window
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // 2. Add current request timestamp
    pipeline.zadd(key, now, `${now}`);
    
    // 3. Count requests in current window
    pipeline.zcard(key);
    
    // 4. Set expiry (cleanup old keys)
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    if (!results) {
      console.error('[RATE_LIMIT] Pipeline execution failed');
      return true; // Fail open
    }

    // Get count from 3rd operation (index 2)
    const countResult = results[2];
    if (!countResult || countResult[0]) {
      console.error('[RATE_LIMIT] Failed to get count:', countResult?.[0]);
      return true; // Fail open
    }

    const currentCount = countResult[1] as number;
    
    // Check if rate limit exceeded
    if (currentCount > maxRequests) {
      console.log(`[RATE_LIMIT] Exceeded: ${identifier} (${currentCount}/${maxRequests})`);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[RATE_LIMIT] Redis error:', error);
    return true; // Fail open (allow request on error)
  }
}

/**
 * Get current rate limit usage
 * @param identifier Unique identifier
 * @param windowMs Time window in milliseconds
 * @returns Current count and remaining requests
 */
export async function getRateLimitInfo(
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ count: number; remaining: number; resetAt: number }> {
  if (!redis || redis.status !== 'ready') {
    return { count: 0, remaining: maxRequests, resetAt: Date.now() + windowMs };
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Remove old entries and count current
    await redis.zremrangebyscore(key, '-inf', windowStart);
    const count = await redis.zcard(key);
    
    // Get oldest timestamp to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldest.length > 0 
      ? parseInt(oldest[1]) + windowMs 
      : now + windowMs;

    return {
      count,
      remaining: Math.max(0, maxRequests - count),
      resetAt
    };
  } catch (error) {
    console.error('[RATE_LIMIT] Failed to get info:', error);
    return { count: 0, remaining: maxRequests, resetAt: now + windowMs };
  }
}

/**
 * Clear rate limit for a specific identifier (admin use)
 * @param identifier Unique identifier to reset
 */
export async function clearRateLimit(identifier: string): Promise<boolean> {
  if (!redis || redis.status !== 'ready') {
    return false;
  }

  try {
    const key = `ratelimit:${identifier}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('[RATE_LIMIT] Failed to clear:', error);
    return false;
  }
}

/**
 * Shutdown Redis connection gracefully
 * Call this during app shutdown
 */
export async function shutdownRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('[REDIS] Disconnected');
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// In your app initialization (e.g., server.ts or app.ts):
import { initRedis } from '@/lib/redis-rate-limit';
initRedis();

// In your API routes:
import { checkRateLimitRedis } from '@/lib/redis-rate-limit';

export async function POST(request: Request) {
  const userId = await getUserId(request);
  
  // Check rate limit: 10 requests per minute
  const allowed = await checkRateLimitRedis(
    `api_checkout:${userId}`,
    10,
    60000
  );
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Process request...
}

// Combined rate limits (user + IP):
const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
const userAllowed = await checkRateLimitRedis(`user:${userId}`, 10, 60000);
const ipAllowed = await checkRateLimitRedis(`ip:${ipAddress}`, 50, 60000);

if (!userAllowed || !ipAllowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
*/
