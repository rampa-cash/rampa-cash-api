import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Web3AuthValidationService } from '../services/web3auth-validation.service';
import { Request } from 'express';

export interface Web3AuthStrategyPayload {
    sub: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
    verifier: string;
    verifierId: string;
    typeOfLogin: string;
    aggregateVerifier?: string;
    aggregateVerifierId?: string;
    iat: number;
    exp: number;
}

@Injectable()
export class Web3AuthStrategy extends PassportStrategy(Strategy, 'web3auth') {
    constructor(private web3AuthValidationService: Web3AuthValidationService) {
        super({
            jwtFromRequest: (req: Request) => {
                // Extract Web3Auth token from request using multiple methods
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    return authHeader.substring(7);
                }

                const xAuthToken = req.headers['x-auth-token'] as string;
                if (xAuthToken) {
                    return xAuthToken;
                }

                const queryToken = req.query.token as string;
                if (queryToken) {
                    return queryToken;
                }

                return null;
            },
            ignoreExpiration: false,
            secretOrKey: 'web3auth-secret', // This will be overridden by your validation service
        });
    }

    async validate(payload: any): Promise<Web3AuthStrategyPayload> {
        try {
            // The payload should already be validated by the JWT strategy
            // We can use the payload directly or validate it further with your service
            if (!payload) {
                throw new UnauthorizedException('Invalid Web3Auth token');
            }

            // If you need additional validation, you can use your validation service
            // const web3AuthUser = await this.web3AuthValidationService.validateWeb3AuthJWT(payload);

            // Return user information in the format expected by Passport
            return {
                sub: payload.sub || payload.id,
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                profileImage: payload.profileImage,
                verifier: payload.verifier,
                verifierId: payload.verifierId,
                typeOfLogin: payload.typeOfLogin,
                aggregateVerifier: payload.aggregateVerifier,
                aggregateVerifierId: payload.aggregateVerifierId,
                iat: payload.iat || Math.floor(Date.now() / 1000),
                exp: payload.exp || Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid Web3Auth token');
        }
    }
}

/**
 * Alternative Web3Auth strategy that uses JWT strategy pattern
 */
@Injectable()
export class Web3AuthJwtStrategy extends PassportStrategy(
    Strategy,
    'web3auth-jwt',
) {
    constructor(private web3AuthValidationService: Web3AuthValidationService) {
        super({
            jwtFromRequest: (req: Request) => {
                // Extract Web3Auth token from request using multiple methods
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    return authHeader.substring(7);
                }

                const xAuthToken = req.headers['x-auth-token'] as string;
                if (xAuthToken) {
                    return xAuthToken;
                }

                const queryToken = req.query.token as string;
                if (queryToken) {
                    return queryToken;
                }

                return null;
            },
            ignoreExpiration: false,
            secretOrKey: 'web3auth-secret', // This will be overridden by your validation service
        });
    }

    async validate(payload: any): Promise<any> {
        try {
            // The payload should already be validated by the JWT strategy
            if (!payload) {
                throw new UnauthorizedException('Invalid Web3Auth token');
            }

            // If you need additional validation, you can use your validation service
            // const web3AuthUser = await this.web3AuthValidationService.validateWeb3AuthJWT(payload);

            // Create and validate user in database
            const user =
                await this.web3AuthValidationService.validateAndCreateUser(
                    payload,
                );

            // Return user information in the format expected by the application
            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                language: user.language,
                authProvider: user.authProvider,
                isActive: user.isActive,
                status: user.status,
                lastLoginAt: user.lastLoginAt,
                web3AuthUser: payload, // Include original Web3Auth user data
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid Web3Auth token');
        }
    }
}
