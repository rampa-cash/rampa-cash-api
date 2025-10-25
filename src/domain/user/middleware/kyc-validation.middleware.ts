import {
    Injectable,
    NestMiddleware,
    BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { KycService } from '../services/kyc.service';

@Injectable()
export class KycValidationMiddleware implements NestMiddleware {
    constructor(private readonly kycService: KycService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        // Extract user ID from request (assuming it's in headers or params)
        const userId = (req.headers['user-id'] as string) || req.params.userId;

        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        try {
            // Check if KYC is required for this endpoint
            const requiresKyc = this.requiresKycValidation(
                req.path,
                req.method,
            );

            if (requiresKyc) {
                await this.kycService.requireKycForTransaction(userId);
            }

            next();
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            // Log error and continue (don't block non-critical operations)
            console.error('KYC validation error:', error);
            next();
        }
    }

    private requiresKycValidation(path: string, method: string): boolean {
        // Define paths that require KYC validation
        const kycRequiredPaths = [
            '/transaction',
            '/transfer',
            '/onramp',
            '/offramp',
            '/wallet/balance',
            '/wallet/transfer',
        ];

        // Define methods that require KYC validation
        const kycRequiredMethods = ['POST', 'PUT', 'PATCH'];

        // Check if the path requires KYC
        const pathRequiresKyc = kycRequiredPaths.some((kycPath) =>
            path.includes(kycPath),
        );

        // Check if the method requires KYC
        const methodRequiresKyc = kycRequiredMethods.includes(method);

        return pathRequiresKyc && methodRequiresKyc;
    }
}

// Factory function for easier configuration
export function createKycValidationMiddleware(kycService: KycService) {
    return new KycValidationMiddleware(kycService);
}

// Decorator for applying KYC validation to specific routes
export function RequireKyc() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const [req] = args;
            const userId =
                (req.headers['user-id'] as string) || req.params.userId;

            if (!userId) {
                throw new BadRequestException('User ID is required');
            }

            // Get KYC service from DI container (this would need to be injected)
            // For now, we'll assume it's available in the request context
            const kycService = req.kycService;

            if (kycService) {
                await kycService.requireKycForTransaction(userId);
            }

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
