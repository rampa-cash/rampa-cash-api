import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Web3AuthNodeService } from '../../../src/domain/auth/services/web3auth-node.service';

// Mock the Web3Auth Node SDK
jest.mock('@web3auth/node-sdk', () => ({
    Web3Auth: jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        connect: jest.fn().mockResolvedValue({
            signer: {
                address: 'test-address',
                publicKey: { toString: () => 'test-public-key' },
                signTransaction: jest
                    .fn()
                    .mockResolvedValue(new Uint8Array([1, 2, 3])),
            },
        }),
    })),
}));

describe('Web3AuthNodeService', () => {
    let service: Web3AuthNodeService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                Web3AuthNodeService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                WEB3AUTH_CLIENT_ID: 'test-client-id',
                                WEB3AUTH_NETWORK: 'sapphire_devnet',
                                WEB3AUTH_CONNECTION_ID: 'test-connection-id',
                                WEB3AUTH_USERID_FIELD: 'sub',
                                WEB3AUTH_USERID_CASE_SENSITIVE: 'false',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<Web3AuthNodeService>(Web3AuthNodeService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should initialize Web3Auth on module init', async () => {
        await service.onModuleInit();
        expect(service).toBeDefined();
    });

    it('should connect with provided parameters', async () => {
        await service.onModuleInit();

        const connectParams = {
            idToken: 'test-id-token',
            userId: 'test-user-id',
            authConnectionId: 'test-connection-id',
            userIdField: 'sub',
            isUserIdCaseSensitive: false,
        };

        const result = await service.connect(connectParams);

        expect(result).toBeDefined();
        expect(result.signer).toBeDefined();
        expect(result.signer.address).toBe('test-address');
    });

    it('should use default values from config when not provided', async () => {
        await service.onModuleInit();

        const connectParams = {
            idToken: 'test-id-token',
        };

        const result = await service.connect(connectParams);

        expect(result).toBeDefined();
        expect(result.signer).toBeDefined();
    });

    it('should throw error when not initialized', async () => {
        const connectParams = {
            idToken: 'test-id-token',
        };

        await expect(service.connect(connectParams)).rejects.toThrow(
            'Web3Auth not initialized',
        );
    });

    it('should throw error when authConnectionId is missing', async () => {
        const configServiceWithoutConnectionId = {
            get: jest.fn((key: string) => {
                const config = {
                    WEB3AUTH_CLIENT_ID: 'test-client-id',
                    WEB3AUTH_NETWORK: 'sapphire_devnet',
                    WEB3AUTH_CONNECTION_ID: undefined,
                    WEB3AUTH_USERID_FIELD: 'sub',
                    WEB3AUTH_USERID_CASE_SENSITIVE: 'false',
                };
                return config[key];
            }),
        };

        const serviceWithoutConnectionId = new Web3AuthNodeService(
            configServiceWithoutConnectionId as any,
        );
        await serviceWithoutConnectionId.onModuleInit();

        const connectParams = {
            idToken: 'test-id-token',
        };

        await expect(
            serviceWithoutConnectionId.connect(connectParams),
        ).rejects.toThrow('Missing authConnectionId');
    });
});
