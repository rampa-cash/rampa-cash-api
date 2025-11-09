import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Redis = require('ioredis');

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
    serialize?: boolean;
}

export interface SessionData {
    userId: string;
    sessionId: string;
    createdAt: Date;
    lastAccessedAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    data?: Record<string, any>;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisCacheService.name);
    private redis: any;
    private isConnected = false;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit(): Promise<void> {
        try {
            this.redis = new Redis({
                host:
                    this.configService.get<string>('REDIS_HOST') || 'localhost',
                port: this.configService.get<number>('REDIS_PORT') || 6379,
                password: this.configService.get<string>('REDIS_PASSWORD'),
                db: this.configService.get<number>('REDIS_DB') || 0,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                connectTimeout: 10000,
                commandTimeout: 5000,
                enableOfflineQueue: false,
            });

            // Event handlers
            this.redis.on('connect', () => {
                this.logger.log('Redis connected');
                this.isConnected = true;
            });

            this.redis.on('ready', () => {
                this.logger.log('Redis ready');
            });

            this.redis.on('error', (error: Error) => {
                this.logger.error(`Redis error: ${error.message}`);
                this.isConnected = false;
            });

            this.redis.on('close', () => {
                this.logger.warn('Redis connection closed');
                this.isConnected = false;
            });

            this.redis.on('reconnecting', () => {
                this.logger.log('Redis reconnecting...');
            });

            // Connect to Redis
            await this.redis.connect();
        } catch (error) {
            this.logger.error(`Failed to initialize Redis: ${error.message}`);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.logger.log('Redis connection closed');
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            if (!this.isConnected) {
                return false;
            }
            await this.redis.ping();
            return true;
        } catch (error) {
            this.logger.error(`Redis health check failed: ${error.message}`);
            return false;
        }
    }

    // Generic cache methods
    async set(
        key: string,
        value: any,
        options: CacheOptions = {},
    ): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const serializedValue =
                options.serialize !== false ? JSON.stringify(value) : value;

            if (options.ttl) {
                await this.redis.setex(fullKey, options.ttl, serializedValue);
            } else {
                await this.redis.set(fullKey, serializedValue);
            }

            return true;
        } catch (error) {
            this.logger.error(
                `Failed to set cache key ${key}: ${error.message}`,
            );
            return false;
        }
    }

    async get<T = any>(
        key: string,
        options: CacheOptions = {},
    ): Promise<T | null> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const value = await this.redis.get(fullKey);

            if (value === null) {
                return null;
            }

            return options.serialize !== false
                ? JSON.parse(value)
                : (value as T);
        } catch (error) {
            this.logger.error(
                `Failed to get cache key ${key}: ${error.message}`,
            );
            return null;
        }
    }

    async del(key: string, options: CacheOptions = {}): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const result = await this.redis.del(fullKey);
            return result > 0;
        } catch (error) {
            this.logger.error(
                `Failed to delete cache key ${key}: ${error.message}`,
            );
            return false;
        }
    }

    async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        } catch (error) {
            this.logger.error(
                `Failed to check cache key ${key}: ${error.message}`,
            );
            return false;
        }
    }

    async expire(
        key: string,
        ttl: number,
        options: CacheOptions = {},
    ): Promise<boolean> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            const result = await this.redis.expire(fullKey, ttl);
            return result === 1;
        } catch (error) {
            this.logger.error(
                `Failed to set expiry for cache key ${key}: ${error.message}`,
            );
            return false;
        }
    }

    async ttl(key: string, options: CacheOptions = {}): Promise<number> {
        try {
            const fullKey = this.buildKey(key, options.prefix);
            return await this.redis.ttl(fullKey);
        } catch (error) {
            this.logger.error(
                `Failed to get TTL for cache key ${key}: ${error.message}`,
            );
            return -1;
        }
    }

    // Session-specific methods
    async setSession(
        sessionId: string,
        sessionData: SessionData,
        ttl?: number,
    ): Promise<boolean> {
        const key = `session:${sessionId}`;
        const sessionTtl =
            ttl || this.configService.get<number>('SESSION_TTL') || 3600; // 1 hour default

        return this.set(key, sessionData, {
            ttl: sessionTtl,
            prefix: 'sessions',
        });
    }

    async getSession(sessionId: string): Promise<SessionData | null> {
        const key = `session:${sessionId}`;
        return this.get<SessionData>(key, { prefix: 'sessions' });
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        const key = `session:${sessionId}`;
        return this.del(key, { prefix: 'sessions' });
    }

    async updateSessionLastAccessed(sessionId: string): Promise<boolean> {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                return false;
            }

            session.lastAccessedAt = new Date();
            return this.setSession(sessionId, session);
        } catch (error) {
            this.logger.error(
                `Failed to update session last accessed: ${error.message}`,
            );
            return false;
        }
    }

    async getUserSessions(userId: string): Promise<SessionData[]> {
        try {
            const pattern = `session:*`;
            const keys = await this.redis.keys(pattern);
            const sessions: SessionData[] = [];

            for (const key of keys) {
                const session = await this.get<SessionData>(key, {
                    prefix: 'sessions',
                });
                if (session && session.userId === userId) {
                    sessions.push(session);
                }
            }

            return sessions;
        } catch (error) {
            this.logger.error(`Failed to get user sessions: ${error.message}`);
            return [];
        }
    }

    async deleteUserSessions(userId: string): Promise<number> {
        try {
            const sessions = await this.getUserSessions(userId);
            let deletedCount = 0;

            for (const session of sessions) {
                if (await this.deleteSession(session.sessionId)) {
                    deletedCount++;
                }
            }

            return deletedCount;
        } catch (error) {
            this.logger.error(
                `Failed to delete user sessions: ${error.message}`,
            );
            return 0;
        }
    }

    // Cache management methods
    async clearPattern(pattern: string): Promise<number> {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }

            const result = await this.redis.del(...keys);
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to clear pattern ${pattern}: ${error.message}`,
            );
            return 0;
        }
    }

    async clearAll(): Promise<boolean> {
        try {
            await this.redis.flushdb();
            return true;
        } catch (error) {
            this.logger.error(`Failed to clear all cache: ${error.message}`);
            return false;
        }
    }

    async getStats(): Promise<{
        connected: boolean;
        memory: any;
        keys: number;
        info: any;
    }> {
        try {
            const info = await this.redis.info();
            const memory = this.parseRedisInfo(info, 'memory');
            const keys = await this.redis.dbsize();

            return {
                connected: this.isConnected,
                memory,
                keys,
                info: this.parseRedisInfo(info),
            };
        } catch (error) {
            this.logger.error(`Failed to get Redis stats: ${error.message}`);
            return {
                connected: false,
                memory: {},
                keys: 0,
                info: {},
            };
        }
    }

    // Utility methods
    private buildKey(key: string, prefix?: string): string {
        if (prefix) {
            return `${prefix}:${key}`;
        }
        return key;
    }

    private parseRedisInfo(info: string, section?: string): any {
        const lines = info.split('\r\n');
        const result: any = {};

        let currentSection = '';
        for (const line of lines) {
            if (line.startsWith('#')) {
                currentSection = line.substring(1).trim();
                continue;
            }

            if (line.includes(':')) {
                const [key, value] = line.split(':', 2);
                if (!section || currentSection === section) {
                    result[key] = isNaN(Number(value)) ? value : Number(value);
                }
            }
        }

        return section ? result : { [currentSection]: result };
    }
}
