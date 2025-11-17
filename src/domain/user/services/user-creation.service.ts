import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import {
    User,
    AuthProvider,
    Language,
    UserVerificationStatus,
    UserStatus,
} from '../entities/user.entity';

export interface ParaSdkSessionData {
    userId: string;
    email?: string; // Changed from required to optional
    name?: string;
    phoneNumber?: string;
    authProvider: 'PARA' | 'EMAIL' | 'PHONE' | 'GOOGLE' | 'APPLE';
    expiresAt: Date;
}

export interface UserCreationResult {
    success: boolean;
    user?: User;
    error?: string;
    reactivated?: boolean; // Indicates if user was reactivated
}

@Injectable()
export class UserCreationService {
    private readonly logger = new Logger(UserCreationService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async createUserFromSession(
        sessionData: ParaSdkSessionData,
    ): Promise<UserCreationResult> {
        try {
            // Check if user already exists - try multiple strategies
            // IMPORTANT: Check regardless of isActive status to handle inactive users
            let existingUser = null;

            // Strategy 1: Email lookup (check both active and inactive)
            if (sessionData.email) {
                existingUser = await this.userRepository.findOne({
                    where: { email: sessionData.email },
                });
            }

            // Strategy 2: Phone lookup (if phone available and user not found)
            if (!existingUser && sessionData.phoneNumber) {
                existingUser = await this.userRepository.findOne({
                    where: { phone: sessionData.phoneNumber },
                });
            }

            // Strategy 3: AuthProviderId lookup (always available as fallback)
            if (!existingUser && sessionData.userId) {
                existingUser = await this.userRepository.findOne({
                    where: {
                        authProviderId: sessionData.userId,
                    },
                });
            }

            // If user exists, handle reactivation if needed
            if (existingUser) {
                const wasInactive = !existingUser.isActive;

                // Reactivate if inactive
                if (wasInactive) {
                    existingUser.isActive = true;
                    // Update user data from session if needed
                    if (sessionData.email && !existingUser.email) {
                        existingUser.email = sessionData.email;
                    }
                    if (sessionData.phoneNumber && !existingUser.phone) {
                        existingUser.phone = sessionData.phoneNumber;
                    }
                    // Update auth provider info if it changed
                    const authProviderEnum = this.mapAuthProvider(
                        sessionData.authProvider,
                    );
                    if (existingUser.authProvider !== authProviderEnum) {
                        existingUser.authProvider = authProviderEnum;
                    }
                    if (existingUser.authProviderId !== sessionData.userId) {
                        existingUser.authProviderId = sessionData.userId;
                    }

                    const reactivatedUser =
                        await this.userRepository.save(existingUser);

                    return {
                        success: true,
                        user: reactivatedUser,
                        reactivated: true,
                    };
                }

                // User exists and is active - return success with existing user
                return {
                    success: true,
                    user: existingUser,
                    reactivated: false,
                };
            }

            // Create new user entity
            const nameParts = (sessionData.name || '').trim().split(' ');

            // Map string authProvider to AuthProvider enum
            const authProviderEnum = this.mapAuthProvider(
                sessionData.authProvider,
            );

            const userData = {
                email: sessionData.email || undefined, // Allow undefined
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                phone: sessionData.phoneNumber || undefined, // Use undefined instead of empty string to avoid unique constraint violation
                authProvider: authProviderEnum, // Use enum value, not string
                authProviderId: sessionData.userId,
                language: Language.EN,
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
            };
            const user = this.userRepository.create(userData);

            // Save user to database
            const savedUser = await this.userRepository.save(user);

            return {
                success: true,
                user: savedUser,
                reactivated: false,
            };
        } catch (error) {
            // Log the error for debugging
            this.logger.error('Error creating user from session', {
                error: error.message,
                stack: error.stack,
                errorType: error.constructor.name,
                isQueryFailedError: error instanceof QueryFailedError,
            });

            // Handle unique constraint violations gracefully
            if (error instanceof QueryFailedError) {
                const driverError = error.driverError;

                // Check if it's a unique constraint violation (PostgreSQL error code 23505)
                if (driverError?.code === '23505') {
                    // Log the constraint details for debugging
                    this.logger.warn('Unique constraint violation detected', {
                        constraint: driverError?.constraint,
                        detail: driverError?.detail,
                        table: driverError?.table,
                        code: driverError?.code,
                    });

                    // Try to find the existing user that caused the violation
                    // Check all possible fields that could cause the violation
                    let existingUser = null;

                    // Strategy 1: Try email (most common)
                    if (sessionData.email) {
                        existingUser = await this.userRepository.findOne({
                            where: { email: sessionData.email },
                        });
                    }

                    // Strategy 2: Try phone (only if phoneNumber is provided and not empty)
                    if (
                        !existingUser &&
                        sessionData.phoneNumber &&
                        sessionData.phoneNumber.trim() !== ''
                    ) {
                        existingUser = await this.userRepository.findOne({
                            where: { phone: sessionData.phoneNumber },
                        });
                    }

                    // Strategy 2b: If phone is empty string in error, search for empty phone or null
                    // This handles the case where the constraint violation is on empty phone
                    if (
                        !existingUser &&
                        driverError?.detail?.includes('phone') &&
                        driverError?.detail?.includes('()')
                    ) {
                        // Try to find user with empty phone or null phone
                        existingUser = await this.userRepository
                            .createQueryBuilder('user')
                            .where(
                                'user.phone = :emptyPhone OR user.phone IS NULL',
                                { emptyPhone: '' },
                            )
                            .getOne();
                    }

                    // Strategy 3: Try authProviderId
                    if (!existingUser && sessionData.userId) {
                        existingUser = await this.userRepository.findOne({
                            where: { authProviderId: sessionData.userId },
                        });
                    }

                    // Strategy 4: If we have constraint detail, try to extract the field value
                    // PostgreSQL detail format: "Key (field_name)=(value) already exists."
                    if (!existingUser && driverError?.detail) {
                        const detailMatch = driverError.detail.match(
                            /Key \(([^)]+)\)=\(([^)]+)\)/,
                        );
                        if (detailMatch) {
                            const fieldName = detailMatch[1];
                            const fieldValue = detailMatch[2];

                            if (fieldName === 'email' && fieldValue) {
                                existingUser =
                                    await this.userRepository.findOne({
                                        where: { email: fieldValue },
                                    });
                            } else if (fieldName === 'phone') {
                                // Handle empty phone case - search for empty string or null
                                if (fieldValue === '' || !fieldValue) {
                                    existingUser = await this.userRepository
                                        .createQueryBuilder('user')
                                        .where(
                                            'user.phone = :emptyPhone OR user.phone IS NULL',
                                            { emptyPhone: '' },
                                        )
                                        .getOne();
                                } else {
                                    existingUser =
                                        await this.userRepository.findOne({
                                            where: { phone: fieldValue },
                                        });
                                }
                            }
                        }
                    }

                    // Strategy 5: Last resort - try to find by any combination
                    if (!existingUser) {
                        // If the error is about empty phone, search for users with empty/null phone
                        if (
                            driverError?.detail?.includes('phone') &&
                            driverError?.detail?.includes('()')
                        ) {
                            existingUser = await this.userRepository
                                .createQueryBuilder('user')
                                .where(
                                    '(user.phone = :emptyPhone OR user.phone IS NULL)',
                                    { emptyPhone: '' },
                                )
                                .andWhere('user.email = :email', {
                                    email: sessionData.email || '',
                                })
                                .getOne();
                        }

                        // Try all combinations
                        if (!existingUser) {
                            const whereConditions: any[] = [];

                            if (sessionData.email) {
                                whereConditions.push({
                                    email: sessionData.email,
                                });
                            }
                            if (
                                sessionData.phoneNumber &&
                                sessionData.phoneNumber.trim() !== ''
                            ) {
                                whereConditions.push({
                                    phone: sessionData.phoneNumber,
                                });
                            }
                            if (sessionData.userId) {
                                whereConditions.push({
                                    authProviderId: sessionData.userId,
                                });
                            }

                            // Try each condition
                            for (const condition of whereConditions) {
                                existingUser =
                                    await this.userRepository.findOne({
                                        where: condition,
                                    });
                                if (existingUser) break;
                            }
                        }
                    }

                    if (existingUser) {
                        // Reactivate if inactive
                        const wasInactive = !existingUser.isActive;
                        if (wasInactive) {
                            existingUser.isActive = true;
                            // Update user data from session if needed
                            if (sessionData.email && !existingUser.email) {
                                existingUser.email = sessionData.email;
                            }
                            if (
                                sessionData.phoneNumber &&
                                !existingUser.phone
                            ) {
                                existingUser.phone = sessionData.phoneNumber;
                            }
                            const authProviderEnum = this.mapAuthProvider(
                                sessionData.authProvider,
                            );
                            if (
                                existingUser.authProvider !== authProviderEnum
                            ) {
                                existingUser.authProvider = authProviderEnum;
                            }
                            if (
                                existingUser.authProviderId !==
                                sessionData.userId
                            ) {
                                existingUser.authProviderId =
                                    sessionData.userId;
                            }

                            const reactivatedUser =
                                await this.userRepository.save(existingUser);
                            return {
                                success: true,
                                user: reactivatedUser,
                                reactivated: true,
                            };
                        }

                        // User exists and is active - return success
                        return {
                            success: true,
                            user: existingUser,
                            reactivated: false,
                        };
                    } else {
                        // User not found even after constraint violation
                        // This shouldn't happen, but log it
                        this.logger.error(
                            'Unique constraint violation but user not found',
                            {
                                email: sessionData.email,
                                phone: sessionData.phoneNumber,
                                userId: sessionData.userId,
                                constraint: driverError?.constraint,
                                detail: driverError?.detail,
                            },
                        );
                        // Still return success: false to indicate failure
                        return {
                            success: false,
                            error: `User already exists but could not be retrieved. Constraint: ${driverError?.constraint}`,
                        };
                    }
                } else {
                    // It's a QueryFailedError but not a unique constraint violation
                    this.logger.error(
                        'QueryFailedError but not unique constraint',
                        {
                            code: driverError?.code,
                            message: driverError?.message,
                        },
                    );
                }
            } else {
                // Not a QueryFailedError - log the error type
                this.logger.error('Non-QueryFailedError caught', {
                    errorType: error.constructor.name,
                    message: error.message,
                });
            }

            // If we get here, it's not a constraint violation we can handle
            // or we couldn't find the existing user
            return {
                success: false,
                error: `Failed to create user: ${error.message}`,
            };
        }
    }

    /**
     * Maps Para SDK auth provider string to AuthProvider enum
     */
    private mapAuthProvider(
        authProvider: 'PARA' | 'EMAIL' | 'PHONE' | 'GOOGLE' | 'APPLE',
    ): AuthProvider {
        switch (authProvider) {
            case 'PHONE':
                return AuthProvider.PHONE;
            case 'EMAIL':
                return AuthProvider.EMAIL;
            case 'GOOGLE':
                return AuthProvider.GOOGLE;
            case 'APPLE':
                return AuthProvider.APPLE;
            case 'PARA':
            default:
                return AuthProvider.PARA;
        }
    }

    async updateUserFromSession(
        userId: string,
        sessionData: ParaSdkSessionData,
    ): Promise<UserCreationResult> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: userId },
            });

            if (!user) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }

            // Update user data from session
            user.email = sessionData.email;
            if (sessionData.name) {
                const nameParts = sessionData.name.trim().split(' ');
                user.firstName = nameParts[0] || user.firstName;
                user.lastName = nameParts.slice(1).join(' ') || user.lastName;
            }
            if (sessionData.phoneNumber) {
                user.phone = sessionData.phoneNumber;
            }
            user.authProvider = sessionData.authProvider as AuthProvider;

            const updatedUser = await this.userRepository.save(user);

            return {
                success: true,
                user: updatedUser,
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to update user: ${error.message}`,
            };
        }
    }

    async getUserByEmail(
        email: string,
        includeInactive = false,
    ): Promise<User | null> {
        const where: any = { email };
        if (!includeInactive) {
            where.isActive = true;
        }
        return await this.userRepository.findOne({
            where,
        });
    }

    async getUserById(
        userId: string,
        includeInactive = false,
    ): Promise<User | null> {
        const where: any = { id: userId };
        if (!includeInactive) {
            where.isActive = true;
        }
        return await this.userRepository.findOne({
            where,
        });
    }

    /**
     * Find user by email regardless of active status
     * Used for login/session import scenarios
     */
    async getUserByEmailAnyStatus(email: string): Promise<User | null> {
        return await this.getUserByEmail(email, true);
    }

    /**
     * Find user by auth provider ID regardless of active status
     * Used for login/session import scenarios
     */
    async getUserByAuthProviderId(
        authProviderId: string,
    ): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { authProviderId },
        });
    }
}
