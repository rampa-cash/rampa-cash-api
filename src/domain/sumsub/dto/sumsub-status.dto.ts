import { SumsubReviewStatus } from '../entities/sumsub-applicant.entity';

export class SumsubStatusDto {
    applicantId: string;
    reviewStatus?: SumsubReviewStatus | string;
    reviewResult?: any;
    levelName?: string;
    createdAt?: string;
    lastSyncedAt?: Date;
    moderationComment?: string;
    isVerified: boolean;
}
