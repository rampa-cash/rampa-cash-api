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
    message: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

interface RequestRecord {
    count: number;
    resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    private requestCounts = new Map<string, RequestRecord>();
    protected config: RateLimitConfig;

    constructor(private configService: ConfigService) {
        this.config = {
            windowMs: parseInt(
                this.configService.get<string>('RATE_LIMIT_WINDOW_MS') ||
                    '900000',
            ), // 15 minutes
            maxRequests: parseInt(
                this.configService.get<string>('RATE_LIMIT_MAX_REQUESTS') ||
                    '100',
            ),
            message: 'Too many requests from this IP, please try again later.',
            skipSuccessfulRequests: false,
            skipFailedRequests: false,
        };
    }

    use(req: Request, res: Response, next: NextFunction) {
        const clientId = this.getClientId(req);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Clean up old entries
        this.cleanupOldEntries(windowStart);

        // Get or create request record for this client
        let record = this.requestCounts.get(clientId);

        if (!record || record.resetTime <= now) {
            record = {
                count: 0,
                resetTime: now + this.config.windowMs,
            };
        }

        // Check if rate limit is exceeded
        if (record.count >= this.config.maxRequests) {
            const resetTime = new Date(record.resetTime);
            res.set({
                'X-RateLimit-Limit': this.config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': resetTime.toISOString(),
                'Retry-After': Math.ceil(
                    (record.resetTime - now) / 1000,
                ).toString(),
            });

            throw new HttpException(
                {
                    message: this.config.message,
                    retryAfter: Math.ceil((record.resetTime - now) / 1000),
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Increment request count
        record.count++;
        this.requestCounts.set(clientId, record);

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': (
                this.config.maxRequests - record.count
            ).toString(),
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        });

        next();
    }

    private getClientId(req: Request): string {
        // Use IP address as primary identifier
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // For authenticated users, you might want to use user ID instead
        const userId = (req as any).user?.id;

        return userId ? `user:${userId}` : `ip:${ip}`;
    }

    private cleanupOldEntries(windowStart: number): void {
        for (const [clientId, record] of this.requestCounts.entries()) {
            if (record.resetTime <= windowStart) {
                this.requestCounts.delete(clientId);
            }
        }
    }
}

// Specific rate limiters for different endpoints
@Injectable()
export class AuthRateLimitMiddleware extends RateLimitMiddleware {
    constructor(configService: ConfigService) {
        super(configService);
        this.config = {
            windowMs: 900000, // 15 minutes
            maxRequests: 5, // 5 login attempts per 15 minutes
            message:
                'Too many authentication attempts, please try again later.',
        };
    }
}

@Injectable()
export class ApiRateLimitMiddleware extends RateLimitMiddleware {
    constructor(configService: ConfigService) {
        super(configService);
        this.config = {
            windowMs: 900000, // 15 minutes
            maxRequests: 1000, // 1000 API calls per 15 minutes
            message: 'Too many API requests, please try again later.',
        };
    }
}

@Injectable()
export class TransactionRateLimitMiddleware extends RateLimitMiddleware {
    constructor(configService: ConfigService) {
        super(configService);
        this.config = {
            windowMs: 3600000, // 1 hour
            maxRequests: 10, // 10 transactions per hour
            message: 'Too many transaction attempts, please try again later.',
        };
    }
}
