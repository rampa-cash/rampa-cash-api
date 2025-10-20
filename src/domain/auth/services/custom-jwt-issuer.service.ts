import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';

export interface IssueIdTokenParams {
    sub: string;
    email?: string;
    name?: string;
    expiresInSeconds?: number;
}

@Injectable()
export class CustomJwtIssuerService {
    constructor(private readonly configService: ConfigService) {}

    async issueIdToken(params: IssueIdTokenParams): Promise<string> {
        const issuer = this.configService.get<string>('WEB3AUTH_CUSTOM_ISSUER');
        const audience = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_AUDIENCE',
        );
        const privateKeyPemRaw = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_PRIVATE_KEY_PEM',
        );
        const algorithm = (this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_ALG',
        ) || 'RS256') as 'RS256' | 'ES256';
        const kid = this.configService.get<string>('WEB3AUTH_CUSTOM_JWT_KID');
        const ttl =
            params.expiresInSeconds ??
            Number(
                this.configService.get<string>('WEB3AUTH_CUSTOM_JWT_TTL') ||
                    '300',
            );

        const privateKeyPem = this.normalizePem(privateKeyPemRaw);

        if (!issuer || !audience || !privateKeyPem || !kid) {
            throw new Error('Missing required Custom JWT configuration');
        }

        const privateKey = await this.importPrivateKey(
            privateKeyPem,
            algorithm,
        );

        const now = Math.floor(Date.now() / 1000);
        const jwt = await new jose.SignJWT({
            sub: params.sub,
            email: params.email,
            name: params.name,
            iat: now,
        })
            .setProtectedHeader({ alg: algorithm, kid })
            .setIssuer(issuer)
            .setAudience(audience)
            .setExpirationTime(now + ttl)
            .sign(privateKey);

        return jwt;
    }

    private async importPrivateKey(
        pem: string,
        alg: 'RS256' | 'ES256',
    ): Promise<jose.KeyLike> {
        try {
            const trimmed = pem.trim();
            if (alg === 'RS256') {
                // Requires PKCS8 (-----BEGIN PRIVATE KEY-----). Convert PKCS#1 if needed:
                // openssl pkcs8 -topk8 -nocrypt -in rsa_private.pem -out privateKey.pem
                return await jose.importPKCS8(trimmed, 'RS256');
            }
            // ES256 requires a P-256 key in PKCS8
            return await jose.importPKCS8(trimmed, 'ES256');
        } catch (e) {
            throw new Error(
                'Invalid private key PEM. Ensure PKCS8 format (BEGIN PRIVATE KEY) and matches WEB3AUTH_CUSTOM_JWT_ALG. For RSA, run: openssl pkcs8 -topk8 -nocrypt -in rsa_private.pem -out privateKey.pem',
            );
        }
    }

    private normalizePem(pem?: string): string | undefined {
        if (!pem) return pem;
        return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
    }
}
