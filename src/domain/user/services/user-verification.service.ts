import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CompleteProfileDto } from '../dto/complete-profile.dto';
import { VerificationStatusDto } from '../dto/verification-status.dto';
import { MissingFieldsDto } from '../dto/missing-fields.dto';
import { UserVerificationStatus, UserStatus } from '../entities/user.entity';

@Injectable()
export class UserVerificationService {
    constructor(private userService: UserService) {}

    /**
     * Completes user profile with missing information
     */
    async completeProfile(
        userId: string,
        profileData: CompleteProfileDto,
    ): Promise<any> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate that we have at least some new information
        const hasNewData = Object.values(profileData).some(
            (value) => value !== undefined && value !== '',
        );
        if (!hasNewData) {
            throw new BadRequestException('No new information provided');
        }

        // Update user profile
        const updatedUser = await this.userService.update(userId, profileData);

        // Check if profile is now complete and verify user if so
        if (this.isProfileComplete(updatedUser)) {
            await this.verifyUser(userId);
        }

        return updatedUser;
    }

    /**
     * Verifies user and activates account
     */
    async verifyUser(userId: string): Promise<any> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return await this.userService.update(userId, {
            verificationStatus: UserVerificationStatus.VERIFIED,
            status: UserStatus.ACTIVE,
            verificationCompletedAt: new Date(),
        });
    }

    /**
     * Gets missing fields for user profile
     */
    async getMissingFields(userId: string): Promise<MissingFieldsDto> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const missingFields: string[] = [];

        if (!user.email) missingFields.push('email');
        if (!user.firstName || user.firstName === 'User')
            missingFields.push('firstName');
        if (!user.lastName || user.lastName === 'User')
            missingFields.push('lastName');

        return {
            missingFields,
            isComplete: missingFields.length === 0,
        };
    }

    /**
     * Gets verification status for user
     */
    async getVerificationStatus(
        userId: string,
    ): Promise<VerificationStatusDto> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const missingFields = await this.getMissingFields(userId);

        return {
            verificationStatus: user.verificationStatus,
            missingFields: missingFields.missingFields,
            isVerified:
                user.verificationStatus === UserVerificationStatus.VERIFIED,
        };
    }

    /**
     * Checks if user profile is complete
     */
    private isProfileComplete(user: any): boolean {
        return !!(
            user.email &&
            user.firstName &&
            user.lastName &&
            user.firstName !== 'User' &&
            user.lastName !== 'User'
        );
    }

    /**
     * Checks if user can perform financial operations
     */
    canPerformFinancialOperations(user: any): boolean {
        return (
            user.verificationStatus === UserVerificationStatus.VERIFIED &&
            user.status === UserStatus.ACTIVE
        );
    }

    /**
     * Checks if user can browse the app
     */
    canBrowseApp(user: any): boolean {
        return (
            user.status === UserStatus.ACTIVE ||
            user.status === UserStatus.PENDING_VERIFICATION
        );
    }

    /**
     * Checks if user should see profile completion screen
     */
    shouldShowProfileCompletion(user: any): boolean {
        return (
            user.verificationStatus ===
            UserVerificationStatus.PENDING_VERIFICATION
        );
    }

    /**
     * Checks if user account is suspended
     */
    isAccountSuspended(user: any): boolean {
        return user.status === UserStatus.SUSPENDED;
    }
}
