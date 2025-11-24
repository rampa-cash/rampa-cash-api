import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { getSumsubConfig } from '../../../config/sumsub.config';
import {
    SumsubAdapter,
    SumsubApplicant,
    SumsubApplicantPayload,
    SumsubSdkToken,
    SumsubStatus,
} from '../../../domain/sumsub/interfaces/sumsub-adapter.interface';

@Injectable()
export class SumsubHttpAdapter implements SumsubAdapter {
    private readonly logger = new Logger(SumsubHttpAdapter.name);
    private readonly appToken: string;
    private readonly secretKey: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        const config = getSumsubConfig(this.configService);
        this.appToken = config.appToken;
        this.secretKey = config.secretKey;
        this.baseUrl =
            config.baseUrl?.replace(/\/$/, '') || 'https://api.sumsub.com';
    }

    async createApplicant(
        payload: SumsubApplicantPayload,
    ): Promise<SumsubApplicant> {
        const search = new URLSearchParams({
            levelName: payload.levelName,
        }).toString();
        const path = `/resources/applicants?${search}`;
        return this.request<SumsubApplicant>('POST', path, {
            externalUserId: payload.externalUserId,
            email: payload.email,
            phone: payload.phone,
            fixedInfo: {
                firstName: payload.firstName,
                lastName: payload.lastName,
            },
            sourceKey: 'rampa',
            metadata: payload.metadata,
        });
    }

    async getApplicant(applicantId: string): Promise<SumsubApplicant | null> {
        const path = `/resources/applicants/${applicantId}`;
        return this.request<SumsubApplicant>('GET', path);
    }

    async getApplicantStatus(
        applicantId: string,
    ): Promise<SumsubStatus | null> {
        const path = `/resources/applicants/${applicantId}/status`;
        return this.request<SumsubStatus>('GET', path);
    }

    async createSdkToken(
        userId: string,
        levelName: string,
    ): Promise<SumsubSdkToken> {
        const search = new URLSearchParams({
            userId: userId,
            levelName,
        }).toString();
        const path = `/resources/accessTokens?${search}`;
        return this.request<SumsubSdkToken>('POST', path);
    }

    async generateShareToken(
        applicantId: string,
        forClientId: string = 'transak',
        ttlInSecs: number = 3600,
    ): Promise<{ token: string; expiresAt: Date }> {
        const path = `/resources/applicants/${applicantId}/shareToken`;

        const body = {
            forClientId, // MUST be "transak" for Transak integration
            ttlInSecs,
        };

        try {
            const response = await this.request<{
                token: string;
                validUntil: string;
            }>('POST', path, body);

            return {
                token: response.token,
                expiresAt: new Date(response.validUntil),
            };
        } catch (error) {
            this.logger.error(
                `Failed to generate share token for applicant ${applicantId}: ${error.message}`,
            );
            throw error;
        }
    }

    async verifyWebhookSignature(
        rawBody: string,
        signature?: string,
    ): Promise<boolean> {
        if (!signature) {
            return false;
        }

        const digest = createHmac('sha256', this.secretKey)
            .update(rawBody)
            .digest('hex');
        return signature === digest || signature === `sha256=${digest}`;
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        body?: Record<string, any>,
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const requestUrl = new URL(url);
        const requestPath = requestUrl.pathname + requestUrl.search;
        const ts = Math.floor(Date.now() / 1000).toString();
        const bodyString = body ? JSON.stringify(body) : '';

        // SumSub signature: ts + METHOD + url + body (if present)
        const hmac = createHmac('sha256', this.secretKey);
        hmac.update(ts);
        hmac.update(method);
        hmac.update(requestPath);
        if (bodyString) {
            hmac.update(bodyString);
        }
        const signature = hmac.digest('hex');

        const headers: Record<string, string> = {
            'X-App-Token': this.appToken,
            'X-App-Access-Ts': ts,
            'X-App-Access-Sig': signature,
            Accept: 'application/json',
        };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? bodyString : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(
                `SumSub request failed: ${method} ${path} -> ${response.status} ${errorText}`,
            );
            throw new Error(
                `SumSub request failed with status ${response.status}`,
            );
        }

        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    }
}
