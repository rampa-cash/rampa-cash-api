import {
    Controller,
    Get,
    Header,
    HttpException,
    HttpStatus,
    Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import type { Response } from 'express';

@Controller('.well-known')
export class JwksController {
    constructor(private readonly configService: ConfigService) {}

    @Get('jwks.json')
    @Header('Content-Type', 'application/json')
    async getJwks(@Res() res: Response): Promise<void> {
        const activePublicKeyPemRaw = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_PUBLIC_KEY_PEM',
        );
        const activeKid = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_KID',
        );
        const alg = (this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_ALG',
        ) || 'RS256') as 'RS256' | 'ES256';
        const prevPublicKeyPemRaw = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_PREV_PUBLIC_KEY_PEM',
        );
        const prevKid = this.configService.get<string>(
            'WEB3AUTH_CUSTOM_JWT_PREV_KID',
        );
        const cacheTtl = Number(
            this.configService.get<string>('JWKS_CACHE_TTL') || '300',
        );

        const activePublicKeyPem = this.normalizePem(activePublicKeyPemRaw);
        const prevPublicKeyPem = this.normalizePem(prevPublicKeyPemRaw);

        if (!activePublicKeyPem || !activeKid) {
            throw new HttpException(
                'JWKS not configured',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        const keys: any[] = [];
        const jwk = await this.convertPemToJwk(
            activePublicKeyPem,
            alg,
            activeKid,
        );
        keys.push(jwk);
        if (prevPublicKeyPem && prevKid) {
            const prevJwk = await this.convertPemToJwk(
                prevPublicKeyPem,
                alg,
                prevKid,
            );
            keys.push(prevJwk);
        }

        res.set('Cache-Control', `public, max-age=${cacheTtl}`);
        res.status(200).send({ keys });
    }

    private async convertPemToJwk(
        pem: string,
        alg: 'RS256' | 'ES256',
        kid: string,
    ): Promise<any> {
        const trimmed = pem.trim();
        if (alg === 'RS256') {
            const key = await jose.importSPKI(trimmed, 'RS256');
            const jwk = await jose.exportJWK(key);
            return { ...jwk, alg: 'RS256', use: 'sig', kid };
        }
        const key = await jose.importSPKI(trimmed, 'ES256');
        const jwk = await jose.exportJWK(key);
        return { ...jwk, alg: 'ES256', use: 'sig', kid };
    }

    private normalizePem(pem?: string): string | undefined {
        if (!pem) return pem;
        // Support envs where PEM is inlined with \n sequences
        return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
    }
}
