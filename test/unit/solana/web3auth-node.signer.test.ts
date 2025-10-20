import { Test, TestingModule } from '@nestjs/testing';
import { Web3AuthNodeSigner } from '../../../src/domain/solana/services/signers/web3auth-node.signer';
import { Web3AuthNodeService } from '../../../src/domain/auth/services/web3auth-node.service';

describe('Web3AuthNodeSigner', () => {
    let signer: Web3AuthNodeSigner;
    let web3AuthNodeService: Web3AuthNodeService;

    const mockSigner = {
        address: 'test-address',
        publicKey: { toString: () => 'test-public-key' },
        signTransaction: jest
            .fn()
            .mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
    };

    const mockWeb3AuthNodeService = {
        connect: jest.fn().mockResolvedValue({
            signer: mockSigner,
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                Web3AuthNodeSigner,
                {
                    provide: Web3AuthNodeService,
                    useValue: mockWeb3AuthNodeService,
                },
            ],
        }).compile();

        signer = module.get<Web3AuthNodeSigner>(Web3AuthNodeSigner);
        web3AuthNodeService =
            module.get<Web3AuthNodeService>(Web3AuthNodeService);
    });

    it('should be defined', () => {
        expect(signer).toBeDefined();
    });

    it('should initialize with idToken', async () => {
        const idToken = 'test-id-token';

        await signer.init({ idToken });

        expect(mockWeb3AuthNodeService.connect).toHaveBeenCalledWith({
            idToken,
        });
    });

    it('should get public key after initialization', async () => {
        const idToken = 'test-id-token';

        await signer.init({ idToken });
        const publicKey = await signer.getPublicKey();

        expect(publicKey).toBe('test-address');
    });

    it('should sign transaction after initialization', async () => {
        const idToken = 'test-id-token';
        const transactionBytes = new Uint8Array([1, 2, 3]);

        await signer.init({ idToken });
        const signedTransaction =
            await signer.signTransaction(transactionBytes);

        expect(mockSigner.signTransaction).toHaveBeenCalledWith(
            transactionBytes,
        );
        expect(signedTransaction).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should handle Buffer input for signTransaction', async () => {
        const idToken = 'test-id-token';
        const transactionBuffer = Buffer.from([1, 2, 3]);

        await signer.init({ idToken });
        const signedTransaction =
            await signer.signTransaction(transactionBuffer);

        expect(mockSigner.signTransaction).toHaveBeenCalledWith(
            new Uint8Array(transactionBuffer),
        );
        expect(signedTransaction).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should throw error when getting public key without initialization', async () => {
        await expect(signer.getPublicKey()).rejects.toThrow(
            'Signer not initialized',
        );
    });

    it('should throw error when signing without initialization', async () => {
        const transactionBytes = new Uint8Array([1, 2, 3]);

        await expect(signer.signTransaction(transactionBytes)).rejects.toThrow(
            'Signer not initialized',
        );
    });

    it('should throw error when no signer is returned', async () => {
        mockWeb3AuthNodeService.connect.mockResolvedValueOnce({});

        const idToken = 'test-id-token';

        await expect(signer.init({ idToken })).rejects.toThrow(
            'No Solana signer returned by Web3Auth',
        );
    });

    it('should handle signer with publicKey property', async () => {
        const mockSignerWithPublicKey = {
            publicKey: 'test-public-key-string',
            signTransaction: jest
                .fn()
                .mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
        };

        mockWeb3AuthNodeService.connect.mockResolvedValueOnce({
            signer: mockSignerWithPublicKey,
        });

        const idToken = 'test-id-token';

        await signer.init({ idToken });
        const publicKey = await signer.getPublicKey();

        expect(publicKey).toBe('test-public-key-string');
    });

    it('should handle signer with publicKey.toString() method', async () => {
        const mockSignerWithToString = {
            publicKey: {
                toString: () => 'test-public-key-toString',
            },
            signTransaction: jest
                .fn()
                .mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
        };

        mockWeb3AuthNodeService.connect.mockResolvedValueOnce({
            signer: mockSignerWithToString,
        });

        const idToken = 'test-id-token';

        await signer.init({ idToken });
        const publicKey = await signer.getPublicKey();

        expect(publicKey).toBe('test-public-key-toString');
    });

    it('should zeroize input buffer after signing', async () => {
        const idToken = 'test-id-token';
        const transactionBytes = new Uint8Array([1, 2, 3]);
        const fillSpy = jest.spyOn(transactionBytes, 'fill');

        await signer.init({ idToken });
        await signer.signTransaction(transactionBytes);

        expect(fillSpy).toHaveBeenCalledWith(0);
    });
});
