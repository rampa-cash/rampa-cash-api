export const SUMSUB_ADAPTER_TOKEN = 'SUMSUB_ADAPTER_TOKEN';

export interface SumsubApplicantPayload {
    externalUserId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    levelName: string;
    metadata?: Record<string, any>;
}

export interface SumsubApplicant {
    id: string;
    createdAt?: string;
    reviewStatus?: string;
    clientComment?: string;
    levelName?: string;
    externalUserId?: string;
}

export interface SumsubSdkToken {
    token: string;
    expiresAt?: Date;
}

export interface SumsubStatus {
    applicantId: string;
    reviewStatus?: string;
    reviewResult?: any;
    levelName?: string;
    createdAt?: string;
    moderationComment?: string;
}

export interface SumsubWebhookPayload {
    applicantId: string;
    reviewStatus?: string;
    reviewResult?: any;
    levelName?: string;
    event: string;
    type: string;
}

export interface SumsubShareTokenResponse {
    token: string;
    validUntil: string;
}

export interface SumsubAdapter {
    createApplicant(payload: SumsubApplicantPayload): Promise<SumsubApplicant>;
    getApplicant(applicantId: string): Promise<SumsubApplicant | null>;
    getApplicantStatus(applicantId: string): Promise<SumsubStatus | null>;
    createSdkToken(userId: string, levelName: string): Promise<SumsubSdkToken>;
    generateShareToken(
        applicantId: string,
        forClientId: string,
        ttlInSecs?: number,
    ): Promise<{ token: string; expiresAt: Date }>;
    verifyWebhookSignature(
        rawBody: string,
        signature?: string,
    ): Promise<boolean>;
}
