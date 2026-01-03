/**
 * Rate Limiter for Socket.IO connections and events
 * Implements sliding window rate limiting to prevent abuse
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request is allowed for the given key
   * @param key - Unique identifier (IP, userId, etc.)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if we're in a new window
    if (now - entry.windowStart >= this.config.windowMs) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if we've exceeded the limit
    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return this.config.maxRequests;
    
    const now = Date.now();
    if (now - entry.windowStart >= this.config.windowMs) {
      return this.config.maxRequests;
    }
    
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Reset the limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart >= this.config.windowMs * 2) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Pre-configured rate limiters for different scenarios
export const rateLimiters = {
  // Connection attempts: 10 per minute per IP
  connection: new RateLimiter({ maxRequests: 10, windowMs: 60000 }),
  
  // Room joins: 5 per minute per user
  roomJoin: new RateLimiter({ maxRequests: 5, windowMs: 60000 }),
  
  // Cursor updates: 60 per second per user (allow smooth cursor movement)
  cursorUpdate: new RateLimiter({ maxRequests: 60, windowMs: 1000 }),
  
  // Selection updates: 30 per second per user
  selectionUpdate: new RateLimiter({ maxRequests: 30, windowMs: 1000 }),
  
  // Typing events: 10 per second per user
  typing: new RateLimiter({ maxRequests: 10, windowMs: 1000 }),
  
  // File switches: 10 per minute per user
  fileSwitch: new RateLimiter({ maxRequests: 10, windowMs: 60000 }),
  
  // Activity updates: 5 per second per user
  activity: new RateLimiter({ maxRequests: 5, windowMs: 1000 })
};

/**
 * Get client IP from socket
 */
export const getClientIp = (socket: any): string => {
  return socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || socket.handshake.address 
    || 'unknown';
};
