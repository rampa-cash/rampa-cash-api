import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    User,
    KycStatus,
    UserVerificationStatus,
} from '../entities/user.entity';

export interface KycUpdateData {
    name?: string;
    email?: string;
    phoneNumber?: string;
}

export interface KycValidationResult {
    isValid: boolean;
    missingFields: string[];
    errors: string[];
}

export interface KycStatusResult {
    status: KycStatus;
    isComplete: boolean;
    missingFields: string[];
    verifiedAt?: Date;
}

@Injectable()
export class KycService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async updateKycData(userId: string, kycData: KycUpdateData): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update user data
        if (kycData.name) {
            // Split name into firstName and lastName
            const nameParts = kycData.name.trim().split(' ');
            user.firstName = nameParts[0] || '';
            user.lastName = nameParts.slice(1).join(' ') || '';
        }
        if (kycData.email) {
            user.email = kycData.email;
        }
        if (kycData.phoneNumber) {
            user.phone = kycData.phoneNumber;
        }

        // Validate KYC completion
        const validation = this.validateKycCompletion(user);
        if (validation.isValid) {
            user.kycStatus = UserVerificationStatus.VERIFIED;
            user.kycVerifiedAt = new Date();
        } else {
            user.kycStatus = UserVerificationStatus.PENDING_VERIFICATION;
        }

        return await this.userRepository.save(user);
    }

    validateKycCompletion(user: User): KycValidationResult {
        const missingFields: string[] = [];
        const errors: string[] = [];

        // Check required fields
        const fullName =
            `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (!fullName) {
            missingFields.push('name');
        }

        if (!user.email || user.email.trim() === '') {
            missingFields.push('email');
        } else if (!this.isValidEmail(user.email)) {
            errors.push('Invalid email format');
        }

        if (!user.phone || user.phone.trim() === '') {
            missingFields.push('phoneNumber');
        } else if (!this.isValidPhoneNumber(user.phone)) {
            errors.push('Invalid phone number format');
        }

        return {
            isValid: missingFields.length === 0 && errors.length === 0,
            missingFields,
            errors,
        };
    }

    async getKycStatus(userId: string): Promise<KycStatusResult> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const validation = this.validateKycCompletion(user);

        // Map UserVerificationStatus to KycStatus
        let kycStatus: KycStatus;
        switch (user.kycStatus) {
            case UserVerificationStatus.VERIFIED:
                kycStatus = KycStatus.VERIFIED;
                break;
            case UserVerificationStatus.PENDING_VERIFICATION:
                kycStatus = KycStatus.PENDING;
                break;
            case UserVerificationStatus.REJECTED:
                kycStatus = KycStatus.PENDING; // Treat rejected as pending for retry
                break;
            default:
                kycStatus = KycStatus.PENDING;
        }

        return {
            status: kycStatus,
            isComplete: validation.isValid,
            missingFields: validation.missingFields,
            verifiedAt: user.kycVerifiedAt,
        };
    }

    async checkKycForTransaction(userId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            return false;
        }

        return user.kycStatus === UserVerificationStatus.VERIFIED;
    }

    async requireKycForTransaction(userId: string): Promise<void> {
        const isKycComplete = await this.checkKycForTransaction(userId);

        if (!isKycComplete) {
            throw new BadRequestException(
                'KYC verification is required to perform transactions. Please complete your profile information.',
            );
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidPhoneNumber(phoneNumber: string): boolean {
        // Basic phone number validation - can be enhanced based on requirements
        const phoneRegex = /^\+?[\d\s\-()]+$/;
        return phoneRegex.test(phoneNumber) && phoneNumber.length >= 10;
    }

    async getKycCompletionProgress(userId: string): Promise<{
        completed: number;
        total: number;
        percentage: number;
        missingFields: string[];
    }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const requiredFields = ['name', 'email', 'phoneNumber'];
        const completedFields = requiredFields.filter((field) => {
            switch (field) {
                case 'name': {
                    const fullName =
                        `${user.firstName || ''} ${user.lastName || ''}`.trim();
                    return fullName !== '';
                }
                case 'email':
                    return user.email && user.email.trim() !== '';
                case 'phoneNumber':
                    return user.phone && user.phone.trim() !== '';
                default:
                    return false;
            }
        });

        const missingFields = requiredFields.filter(
            (field) => !completedFields.includes(field),
        );
        const percentage = Math.round(
            (completedFields.length / requiredFields.length) * 100,
        );

        return {
            completed: completedFields.length,
            total: requiredFields.length,
            percentage,
            missingFields,
        };
    }
}
