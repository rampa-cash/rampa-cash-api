import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
    SumsubApplicantEntity,
    SumsubReviewStatus,
    VerificationSource,
} from '../entities/sumsub-applicant.entity';
import { CreateApplicantDto } from '../dto/create-applicant.dto';
import { SumsubStatusDto } from '../dto/sumsub-status.dto';
import {
    SUMSUB_ADAPTER_TOKEN,
    SumsubAdapter,
    SumsubApplicantPayload,
    SumsubStatus,
    SumsubWebhookPayload,
} from '../interfaces/sumsub-adapter.interface';
import { SumsubSdkToken } from '../interfaces/sumsub-adapter.interface';
import { UserService } from '../../user/services/user.service';
import {
    KycStatus,
    UserStatus,
    UserVerificationStatus,
} from '../../user/entities/user.entity';
import { getSumsubConfig } from '../../../config/sumsub.config';

@Injectable()
export class SumsubService {
    private readonly logger = new Logger(SumsubService.name);
    private readonly defaultLevelName: string;

    constructor(
        @InjectRepository(SumsubApplicantEntity)
        private readonly applicantRepository: Repository<SumsubApplicantEntity>,
        @Inject(SUMSUB_ADAPTER_TOKEN)
        private readonly adapter: SumsubAdapter,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {
        const config = getSumsubConfig(this.configService);
        this.defaultLevelName = config.levelName;
    }

    async createOrGetApplicant(
        userId: string,
        dto: CreateApplicantDto = {},
    ): Promise<{ applicant: SumsubApplicantEntity; sdkToken: SumsubSdkToken }> {
        const user = await this.userService.findOne(userId);

        let applicant = await this.applicantRepository.findOne({
            where: { userId },
        });

        const levelName = dto.source
            ? `${this.defaultLevelName}-${dto.source}`
            : this.defaultLevelName;

        if (!applicant?.applicantId) {
            const payload: SumsubApplicantPayload = {
                externalUserId: user.id,
                email: dto.email ?? user.email,
                phone: dto.phone ?? user.phone,
                firstName: dto.firstName ?? user.firstName,
                lastName: dto.lastName ?? user.lastName,
                levelName,
                metadata: dto.metadata,
            };

            const createdApplicant =
                await this.adapter.createApplicant(payload);

            applicant = this.applicantRepository.create({
                userId,
                applicantId: createdApplicant.id,
                externalUserId: createdApplicant.externalUserId ?? user.id,
                levelName: createdApplicant.levelName ?? levelName,
                reviewStatus:
                    (createdApplicant.reviewStatus as SumsubReviewStatus) ??
                    SumsubReviewStatus.INITIATED,
                source: dto.source ?? VerificationSource.RAMPA,
                metadata: dto.metadata,
            });

            await this.applicantRepository.save(applicant);
        } else if (dto.metadata) {
            applicant.metadata = {
                ...(applicant.metadata || {}),
                ...dto.metadata,
            };
            await this.applicantRepository.save(applicant);
        }

        const sdkToken = await this.createSdkToken(
            userId,
            applicant.levelName || levelName,
        );

        return { applicant, sdkToken };
    }

    async getApplicant(userId: string): Promise<SumsubApplicantEntity> {
        const applicant = await this.applicantRepository.findOne({
            where: { userId },
        });

        if (!applicant) {
            throw new NotFoundException('Applicant not found for user');
        }

        return applicant;
    }

    async getStatus(userId: string): Promise<SumsubStatusDto> {
        const applicant = await this.getApplicant(userId);
        if (!applicant.applicantId) {
            throw new NotFoundException('Applicant not created yet');
        }

        const status = await this.adapter.getApplicantStatus(
            applicant.applicantId,
        );

        if (status) {
            await this.persistStatus(applicant, status);
        }

        const isVerified = this.isVerified(status);

        return {
            applicantId: applicant.applicantId,
            reviewStatus: status?.reviewStatus || applicant.reviewStatus,
            reviewResult: status?.reviewResult || applicant.reviewResult,
            levelName: status?.levelName || applicant.levelName,
            createdAt: status?.createdAt,
            lastSyncedAt: new Date(),
            isVerified,
        };
    }

    async getOrCreateSdkTokenByUser(
        userId: string,
        levelName?: string,
    ): Promise<SumsubSdkToken> {
        const { applicant } = await this.createOrGetApplicant(userId);
        return this.createSdkToken(
            userId,
            levelName || applicant.levelName || this.defaultLevelName,
        );
    }

    async handleWebhook(
        rawBody: string,
        signature: string | undefined,
        payload: SumsubWebhookPayload,
    ): Promise<void> {
        const isValid = await this.adapter.verifyWebhookSignature(
            rawBody,
            signature,
        );

        if (!isValid) {
            this.logger.warn('Invalid SumSub webhook signature');
            throw new NotFoundException('Invalid webhook signature');
        }

        const applicant = await this.applicantRepository.findOne({
            where: { applicantId: payload.applicantId },
        });

        if (!applicant) {
            this.logger.warn(
                `Webhook for unknown applicant: ${payload.applicantId}`,
            );
            return;
        }

        const status: SumsubStatus = {
            applicantId: payload.applicantId,
            reviewStatus: payload.reviewStatus,
            reviewResult: payload.reviewResult,
            levelName: payload.levelName,
        };

        await this.persistStatus(applicant, status);
    }

    private async persistStatus(
        applicant: SumsubApplicantEntity,
        status: SumsubStatus,
    ) {
        console.log();

        applicant.reviewStatus =
            (status.reviewStatus as SumsubReviewStatus) ??
            applicant.reviewStatus;
        applicant.reviewResult = status.reviewResult ?? applicant.reviewResult;
        applicant.levelName = status.levelName ?? applicant.levelName;
        applicant.lastSyncedAt = new Date();
        await this.applicantRepository.save(applicant);

        const isVerified = this.isVerified(status);
        await this.syncUserVerification(applicant.userId, isVerified);
    }

    private async syncUserVerification(userId: string, verified: boolean) {
        if (verified) {
            await this.userService.updateKycStatus(userId, KycStatus.VERIFIED);
            await this.userService.update(userId, {
                verificationStatus: UserVerificationStatus.VERIFIED,
                status: UserStatus.ACTIVE,
                verificationCompletedAt: new Date(),
            });
        } else {
            await this.userService.updateKycStatus(userId, KycStatus.COMPLETED);
        }
    }

    private isVerified(status?: SumsubStatus | null): boolean {
        const answer =
            status?.reviewResult?.reviewAnswer || status?.reviewStatus;
        console.log(
            '[Sumsub]: IsVerified ',
            status,
            ' :conditions  ',
            (answer &&
                typeof answer === 'string' &&
                answer.toUpperCase() === 'GREEN') ||
                status?.reviewStatus === SumsubReviewStatus.COMPLETED,
            '   ',
        );

        return (
            (answer &&
                typeof answer === 'string' &&
                answer.toUpperCase() === 'GREEN') ||
            status?.reviewStatus === SumsubReviewStatus.COMPLETED
        );
    }

    /**
     * Get full applicant data from Sumsub API (includes address, fixedInfo, etc.)
     * Used for smart provider routing (residence vs nationality)
     * @param applicantId - Sumsub applicant ID
     */
    async getApplicantData(applicantId: string): Promise<any> {
        try {
            // Get full applicant data from Sumsub API
            // This includes address (residence) and fixedInfo (document country)
            return await this.adapter.getApplicant(applicantId);
        } catch (error) {
            this.logger.error(
                `Failed to get applicant data for ${applicantId}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * Generate KYC share token for Transak (or other partners)
     * @param userId - User ID
     * @param forClientId - Partner client ID (default: "transak")
     * @param ttlInSecs - Token expiration in seconds (default: 3600 = 1 hour)
     */
    async generateShareToken(
        userId: string,
        forClientId: string = 'transak',
        ttlInSecs: number = 3600,
    ): Promise<{ token: string; expiresAt: Date }> {
        const applicant = await this.getApplicant(userId);

        if (!applicant.applicantId) {
            throw new NotFoundException('Applicant not found for user');
        }

        // Check if user is verified
        const status = await this.getStatus(userId);
        if (!status.isVerified) {
            throw new NotFoundException(
                'User must complete KYC verification before generating share token',
            );
        }

        return this.adapter.generateShareToken(
            applicant.applicantId,
            forClientId,
            ttlInSecs,
        );
    }

    private async createSdkToken(
        userId: string,
        levelName: string,
    ): Promise<SumsubSdkToken> {
        return this.adapter.createSdkToken(userId, levelName);
    }
}
