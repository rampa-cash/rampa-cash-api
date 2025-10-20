import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Package will be installed in deployment env
import { Web3Auth } from '@web3auth/node-sdk';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Package will be installed in deployment env
import type { WEB3AUTH_NETWORK_TYPE } from '@web3auth/node-sdk';
import { SignJWT, importPKCS8 } from 'jose';

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
        // Get the private key from environment
        const privateKeyPem = this.configService.get<string>('WEB3AUTH_CUSTOM_JWT_PRIVATE_KEY_PEM');
        if (!privateKeyPem) {
            throw new Error('WEB3AUTH_CUSTOM_JWT_PRIVATE_KEY_PEM not configured');
        }

        // Convert PEM string to proper format for jose
        const privateKeyString = privateKeyPem.replace(/\\n/g, '\n');
        
        // Import the private key
        const privateKey = await importPKCS8(privateKeyString, 'RS256');

        // Create and sign the JWT using jose library
        // This JWT will be verified by Web3Auth using the JWKS endpoint
        const jwt = await new SignJWT({
            sub: userId,
            // Add any additional claims that Web3Auth might expect
            email: 'user@example.com', // You might want to get this from user data
        })
            .setProtectedHeader({ 
                alg: 'RS256',
                typ: 'JWT',
                kid: this.configService.get<string>('WEB3AUTH_CUSTOM_JWT_KID') || 'key-v1'
            })
            .setIssuedAt()
            .setExpirationTime('5m')
            .setIssuer(
                this.configService.get<string>('WEB3AUTH_CUSTOM_ISSUER') ||
                'https://auth.rampa.local'
            )
            .setAudience(
                this.configService.get<string>('WEB3AUTH_CUSTOM_AUDIENCE') ||
                'urn:rampa-web3auth'
            )
            .sign(privateKey);

        return jwt;
    }
}
