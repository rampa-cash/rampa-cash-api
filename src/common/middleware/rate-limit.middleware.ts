import {
    Injectable,
    NestMiddleware,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    private readonly store = new Map<string, RateLimitEntry>();
    private readonly config: RateLimitConfig;

    constructor(private readonly configService: ConfigService) {
        this.config = {
            windowMs:
                this.configService.get<number>('RATE_LIMIT_WINDOW_MS') ||
                15 * 60 * 1000, // 15 minutes
            maxRequests:
                this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS') ||
                100,
            message: 'Too many requests, please try again later',
            skipSuccessfulRequests: false,
            skipFailedRequests: false,
            keyGenerator: (req: Request) => {
                // Use IP address as default key
                return req.ip || req.connection.remoteAddress || 'unknown';
            },
        };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const key = this.config.keyGenerator?.(req) || req.ip || 'anonymous';
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Clean up expired entries
        this.cleanupExpiredEntries(windowStart);

        // Get or create rate limit entry
        let entry = this.store.get(key);
        if (!entry || entry.resetTime <= now) {
            entry = {
                count: 0,
                resetTime: now + this.config.windowMs,
            };
        }

        // Check if limit exceeded
        if (entry.count >= this.config.maxRequests) {
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

            res.set({
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': this.config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            });

            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: this.config.message,
                    retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Increment counter
        entry.count++;
        this.store.set(key, entry);

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(
                0,
                this.config.maxRequests - entry.count,
            ).toString(),
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
        });

        // Track response for conditional counting
        const originalSend = res.send;
        res.send = function (body: any) {
            const statusCode = res.statusCode;

            // Count request based on configuration
            if (this.config.skipSuccessfulRequests && statusCode < 400) {
                // Don't count successful requests
            } else if (this.config.skipFailedRequests && statusCode >= 400) {
                // Don't count failed requests
            } else {
                // Count all requests (default behavior)
            }

            return originalSend.call(this, body);
        }.bind(this);

        next();
    }

    private cleanupExpiredEntries(windowStart: number): void {
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetTime <= windowStart) {
                this.store.delete(key);
            }
        }
    }

    // Method to reset rate limit for a specific key
    resetRateLimit(key: string): void {
        this.store.delete(key);
    }

    // Method to get current rate limit status for a key
    getRateLimitStatus(key: string): {
        count: number;
        remaining: number;
        resetTime: number;
        limit: number;
    } | null {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }

        return {
            count: entry.count,
            remaining: Math.max(0, this.config.maxRequests - entry.count),
            resetTime: entry.resetTime,
            limit: this.config.maxRequests,
        };
    }

    // Method to get all rate limit entries (for monitoring)
    getAllRateLimits(): Array<{
        key: string;
        count: number;
        remaining: number;
        resetTime: number;
        limit: number;
    }> {
        const now = Date.now();
        const entries: Array<{
            key: string;
            count: number;
            remaining: number;
            resetTime: number;
            limit: number;
        }> = [];

        for (const [key, entry] of this.store.entries()) {
            if (entry.resetTime > now) {
                entries.push({
                    key,
                    count: entry.count,
                    remaining: Math.max(
                        0,
                        this.config.maxRequests - entry.count,
                    ),
                    resetTime: entry.resetTime,
                    limit: this.config.maxRequests,
                });
            }
        }

        return entries;
    }
}
