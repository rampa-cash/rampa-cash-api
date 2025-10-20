import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Package will be installed in deployment env
import { Web3Auth } from '@web3auth/node-sdk';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Package will be installed in deployment env
import type { WEB3AUTH_NETWORK_TYPE } from '@web3auth/node-sdk';

export interface ConnectParams {
    userId: string;
    authConnectionId?: string;
    userIdField?: string;
    isUserIdCaseSensitive?: boolean;
}

@Injectable()
export class Web3AuthNodeService implements OnModuleInit {
    private web3auth?: any;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        const clientId = this.configService.get<string>('WEB3AUTH_CLIENT_ID');
        const network =
            this.configService.get<string>('WEB3AUTH_NETWORK') ||
            'sapphire_mainnet';
        if (!clientId) return;
        this.web3auth = new Web3Auth({
            clientId,
            web3AuthNetwork: network as WEB3AUTH_NETWORK_TYPE,
        });
        await this.web3auth.init();
    }

    async connect(params: ConnectParams): Promise<any> {
        if (!this.web3auth) throw new Error('Web3Auth not initialized');
        const authConnectionId =
            params.authConnectionId ||
            this.configService.get<string>('WEB3AUTH_CONNECTION_ID');
        if (!authConnectionId) throw new Error('Missing authConnectionId');

        // Generate a short-lived idToken for this user
        const idToken = await this.generateIdToken(params.userId);

        return this.web3auth.connect({
            authConnectionId,
            idToken,
            userId: params.userId,
            userIdField:
                params.userIdField ||
                this.configService.get<string>('WEB3AUTH_USERID_FIELD'),
            isUserIdCaseSensitive:
                params.isUserIdCaseSensitive ??
                this.configService.get<string>(
                    'WEB3AUTH_USERID_CASE_SENSITIVE',
                ) === 'true',
        });
    }

    private async generateIdToken(userId: string): Promise<string> {
        // Simple JWT generation for Web3Auth connection
        // In production, you might want to use a more robust JWT library
        const header = {
            alg: 'HS256',
            typ: 'JWT',
        };

        const payload = {
            sub: userId,
            iss:
                this.configService.get<string>('JWT_ISSUER') ||
                'rampa-cash-api',
            aud:
                this.configService.get<string>('WEB3AUTH_AUDIENCE') ||
                'urn:rampa-web3auth',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        };

        // For now, we'll use a simple approach - in production you'd want proper JWT signing
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
            'base64url',
        );
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
            'base64url',
        );
        const signature = Buffer.from(
            `${encodedHeader}.${encodedPayload}`,
        ).toString('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }
}
