import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataValidationService } from '../services/data-validation.service';
import validator from 'validator';
const xss = require('xss');

interface ValidationConfig {
    maxBodySize: number;
    maxQuerySize: number;
    allowedContentTypes: string[];
    sanitizeInput: boolean;
    validateJson: boolean;
    blockSuspiciousPatterns: boolean;
}

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
    private readonly config: ValidationConfig;

    constructor(private readonly validationService: DataValidationService) {
        this.config = {
            maxBodySize: 1024 * 1024, // 1MB
            maxQuerySize: 2048, // 2KB
            allowedContentTypes: [
                'application/json',
                'application/x-www-form-urlencoded',
                'multipart/form-data',
                'text/plain',
            ],
            sanitizeInput: true,
            validateJson: true,
            blockSuspiciousPatterns: true,
        };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        try {
            // Validate request size
            this.validateRequestSize(req);

            // Validate content type
            this.validateContentType(req);

            // Sanitize and validate request data
            this.sanitizeRequestData(req);

            // Validate JSON if applicable
            if (this.config.validateJson && this.isJsonRequest(req)) {
                this.validateJsonStructure(req);
            }

            // Check for suspicious patterns
            if (this.config.blockSuspiciousPatterns) {
                this.checkSuspiciousPatterns(req);
            }

            next();
        } catch (error) {
            throw new BadRequestException(`Request validation failed: ${error.message}`);
        }
    }

    private validateRequestSize(req: Request): void {
        const contentLength = parseInt(req.get('content-length') || '0');

        if (contentLength > this.config.maxBodySize) {
            throw new Error(`Request body too large. Maximum size: ${this.config.maxBodySize} bytes`);
        }

        // Check query string length
        const queryString = req.url.split('?')[1] || '';
        if (queryString.length > this.config.maxQuerySize) {
            throw new Error(`Query string too long. Maximum size: ${this.config.maxQuerySize} characters`);
        }
    }

    private validateContentType(req: Request): void {
        const contentType = req.get('content-type') || '';

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
            const isValidContentType = this.config.allowedContentTypes.some(type => 
                contentType.includes(type)
            );

            if (!isValidContentType) {
                throw new Error(`Invalid content type: ${contentType}`);
            }
        }
    }

    private sanitizeRequestData(req: Request): void {
        // Sanitize query parameters
        if (req.query) {
            req.query = this.sanitizeObject(req.query);
        }

        // Sanitize body parameters
        if (req.body && typeof req.body === 'object') {
            req.body = this.sanitizeObject(req.body);
        }

        // Sanitize headers (except system headers)
        const systemHeaders = [
            'host',
            'user-agent',
            'accept',
            'accept-language',
            'accept-encoding',
            'connection',
            'upgrade',
            'proxy-connection',
            'content-length',
            'content-type',
            'authorization',
            'x-forwarded-for',
            'x-real-ip',
            'x-forwarded-proto',
            'x-forwarded-host',
        ];

        for (const [key, value] of Object.entries(req.headers)) {
            if (!systemHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
                req.headers[key] = this.sanitizeString(value);
            }
        }
    }

    private sanitizeObject(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        if (typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = this.sanitizeString(key);
                sanitized[sanitizedKey] = this.sanitizeObject(value);
            }
            return sanitized;
        }

        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }

        return obj;
    }

    private sanitizeString(str: string): string {
        if (!str || typeof str !== 'string') {
            return str;
        }

        // Remove null bytes
        str = str.replace(/\0/g, '');

        // Trim whitespace
        str = str.trim();

        // XSS protection
        if (this.config.sanitizeInput) {
            str = xss(str, {
                whiteList: {},
                stripIgnoreTag: true,
                stripIgnoreTagBody: ['script'],
            });
        }

        // Remove control characters except newlines and tabs
        str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        return str;
    }

    private isJsonRequest(req: Request): boolean {
        const contentType = req.get('content-type') || '';
        return contentType.includes('application/json');
    }

    private validateJsonStructure(req: Request): void {
        if (!req.body || typeof req.body !== 'object') {
            return;
        }

        // Check for circular references
        try {
            JSON.stringify(req.body);
        } catch (error) {
            throw new Error('Invalid JSON structure: circular reference detected');
        }

        // Check for prototype pollution
        this.checkPrototypePollution(req.body);
    }

    private checkPrototypePollution(obj: any, path: string = ''): void {
        if (obj === null || typeof obj !== 'object') {
            return;
        }

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                // Check for dangerous keys
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    throw new Error(`Prototype pollution detected at path: ${path}.${key}`);
                }

                // Recursively check nested objects
                this.checkPrototypePollution(obj[key], `${path}.${key}`);
            }
        }
    }

    private checkSuspiciousPatterns(req: Request): void {
        const suspiciousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload\s*=/gi,
            /onerror\s*=/gi,
            /onclick\s*=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi,
            /url\s*\(/gi,
            /@import/gi,
            /\.\.\//g,
            /\.\.\\/g,
            /union\s+select/gi,
            /drop\s+table/gi,
            /delete\s+from/gi,
            /insert\s+into/gi,
            /update\s+set/gi,
            /exec\s*\(/gi,
            /system\s*\(/gi,
            /shell_exec\s*\(/gi,
        ];

        const checkString = (str: string, context: string) => {
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(str)) {
                    throw new Error(`Suspicious pattern detected in ${context}: ${pattern.source}`);
                }
            }
        };

        // Check URL
        checkString(req.url, 'URL');

        // Check query parameters
        if (req.query) {
            for (const [key, value] of Object.entries(req.query)) {
                if (typeof value === 'string') {
                    checkString(value, `query parameter '${key}'`);
                }
            }
        }

        // Check body
        if (req.body && typeof req.body === 'object') {
            this.checkObjectForSuspiciousPatterns(req.body, 'request body');
        }

        // Check headers
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
                checkString(value, `header '${key}'`);
            }
        }
    }

    private checkObjectForSuspiciousPatterns(obj: any, context: string): void {
        if (obj === null || typeof obj !== 'object') {
            return;
        }

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                const suspiciousPatterns = [
                    /<script[^>]*>.*?<\/script>/gi,
                    /javascript:/gi,
                    /vbscript:/gi,
                    /onload\s*=/gi,
                    /onerror\s*=/gi,
                    /onclick\s*=/gi,
                    /eval\s*\(/gi,
                    /expression\s*\(/gi,
                    /url\s*\(/gi,
                    /@import/gi,
                    /\.\.\//g,
                    /\.\.\\/g,
                    /union\s+select/gi,
                    /drop\s+table/gi,
                    /delete\s+from/gi,
                    /insert\s+into/gi,
                    /update\s+set/gi,
                    /exec\s*\(/gi,
                    /system\s*\(/gi,
                    /shell_exec\s*\(/gi,
                ];

                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(value)) {
                        throw new Error(`Suspicious pattern detected in ${context}.${key}: ${pattern.source}`);
                    }
                }
            } else if (typeof value === 'object') {
                this.checkObjectForSuspiciousPatterns(value, `${context}.${key}`);
            }
        }
    }
}
