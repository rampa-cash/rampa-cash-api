import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}

@Injectable()
export class UserCreationService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async createUserFromSession(
        sessionData: ParaSdkSessionData,
    ): Promise<UserCreationResult> {
        try {
            // Check if user already exists - try multiple strategies
            let existingUser = null;

            if (sessionData.email) {
                existingUser = await this.userRepository.findOne({
                    where: { email: sessionData.email, isActive: true },
                });
            }

            if (!existingUser && sessionData.phoneNumber) {
                existingUser = await this.userRepository.findOne({
                    where: { phone: sessionData.phoneNumber, isActive: true },
                });
            }

            if (!existingUser && sessionData.userId) {
                existingUser = await this.userRepository.findOne({
                    where: {
                        authProviderId: sessionData.userId,
                        isActive: true,
                    },
                });
            }

            if (existingUser) {
                return {
                    success: false,
                    error: 'User already exists',
                };
            }

            // Create new user entity
            const nameParts = (sessionData.name || '').trim().split(' ');

            // Map string authProvider to AuthProvider enum
            // ParaSdkSessionData uses 'PARA' | 'EMAIL' | 'PHONE' | 'GOOGLE' | 'APPLE'
            // AuthProvider enum uses lowercase: 'para' | 'email' | 'phone' | 'google' | 'apple'
            let authProviderEnum: AuthProvider;
            switch (sessionData.authProvider) {
                case 'PHONE':
                    authProviderEnum = AuthProvider.PHONE;
                    break;
                case 'EMAIL':
                    authProviderEnum = AuthProvider.EMAIL;
                    break;
                case 'GOOGLE':
                    authProviderEnum = AuthProvider.GOOGLE;
                    break;
                case 'APPLE':
                    authProviderEnum = AuthProvider.APPLE;
                    break;
                case 'PARA':
                default:
                    authProviderEnum = AuthProvider.PARA;
                    break;
            }

            const userData = {
                email: sessionData.email || undefined, // Allow undefined
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                phone: sessionData.phoneNumber || '',
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
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to create user: ${error.message}`,
            };
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

    async getUserByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { email },
        });
    }

    async getUserById(userId: string): Promise<User | null> {
        return await this.userRepository.findOne({
            where: { id: userId },
        });
    }
}
