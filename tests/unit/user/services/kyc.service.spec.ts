import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycService } from '../../../../src/domain/user/services/kyc.service';
import { User, KycStatus, Language, AuthProvider, UserVerificationStatus, UserStatus } from '../../../../src/domain/user/entities/user.entity';

describe('KycService', () => {
    let service: KycService;
    let userRepository: Repository<User>;

    const mockUserRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KycService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<KycService>(KycService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateKycData', () => {
        const mockUser = {
            id: 'user-123',
            name: 'John Doe',
            email: 'john@example.com',
            phoneNumber: '+1234567890',
            kycStatus: KycStatus.PENDING,
            kycVerifiedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should update KYC data successfully', async () => {
            const kycData = {
                name: 'Updated Name',
                email: 'updated@example.com',
                phoneNumber: '+9876543210',
            };

            const updatedUser = {
                ...mockUser,
                ...kycData,
                kycStatus: KycStatus.COMPLETED,
                kycVerifiedAt: expect.any(Date),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.save.mockResolvedValue(updatedUser);

            const result = await service.updateKycData('user-123', kycData);

            expect(result).toEqual(updatedUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
            });
            expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
        });

        it('should handle user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.updateKycData('non-existent-user', {})).rejects.toThrow(
                'User not found'
            );
        });

        it('should set KYC status to PENDING if validation fails', async () => {
            const incompleteUser = {
                ...mockUser,
                name: '',
                email: 'invalid-email',
                phoneNumber: '',
            };

            const kycData = {
                name: '',
                email: 'invalid-email',
                phoneNumber: '',
            };

            mockUserRepository.findOne.mockResolvedValue(incompleteUser);
            mockUserRepository.save.mockResolvedValue({
                ...incompleteUser,
                kycStatus: KycStatus.PENDING,
            });

            const result = await service.updateKycData('user-123', kycData);

            expect(result.kycStatus).toBe(KycStatus.PENDING);
        });
    });

    describe('validateKycCompletion', () => {
        it('should validate complete KYC data', () => {
            const completeUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            const result = service.validateKycCompletion(completeUser);

            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
            expect(result.errors).toEqual([]);
        });

        it('should identify missing fields', () => {
            const incompleteUser = {
                id: 'user-123',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            const result = service.validateKycCompletion(incompleteUser);

            expect(result.isValid).toBe(false);
            expect(result.missingFields).toEqual(['name', 'email', 'phoneNumber']);
        });

        it('should identify invalid email format', () => {
            const userWithInvalidEmail = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            const result = service.validateKycCompletion(userWithInvalidEmail);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid email format');
        });

        it('should identify invalid phone number format', () => {
            const userWithInvalidPhone = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: 'invalid-phone',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            const result = service.validateKycCompletion(userWithInvalidPhone);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid phone number format');
        });
    });

    describe('getKycStatus', () => {
        it('should return KYC status for user', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.VERIFIED,
                kycStatus: UserVerificationStatus.VERIFIED,
                kycVerifiedAt: new Date(),
                status: UserStatus.ACTIVE,
                verificationCompletedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getKycStatus('user-123');

            expect(result).toEqual({
                status: KycStatus.COMPLETED,
                isComplete: true,
                missingFields: [],
                verifiedAt: mockUser.kycVerifiedAt,
            });
        });

        it('should handle user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.getKycStatus('non-existent-user')).rejects.toThrow(
                'User not found'
            );
        });
    });

    describe('checkKycForTransaction', () => {
        it('should return true for completed KYC', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.VERIFIED,
                kycStatus: UserVerificationStatus.VERIFIED,
                kycVerifiedAt: new Date(),
                status: UserStatus.ACTIVE,
                verificationCompletedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.checkKycForTransaction('user-123');

            expect(result).toBe(true);
        });

        it('should return false for incomplete KYC', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.checkKycForTransaction('user-123');

            expect(result).toBe(false);
        });

        it('should return false for non-existent user', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.checkKycForTransaction('non-existent-user');

            expect(result).toBe(false);
        });
    });

    describe('requireKycForTransaction', () => {
        it('should not throw for completed KYC', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.VERIFIED,
                kycStatus: UserVerificationStatus.VERIFIED,
                kycVerifiedAt: new Date(),
                status: UserStatus.ACTIVE,
                verificationCompletedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await expect(service.requireKycForTransaction('user-123')).resolves.not.toThrow();
        });

        it('should throw for incomplete KYC', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            await expect(service.requireKycForTransaction('user-123')).rejects.toThrow(
                'KYC verification is required to perform transactions'
            );
        });
    });

    describe('getKycCompletionProgress', () => {
        it('should return completion progress', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getKycCompletionProgress('user-123');

            expect(result).toEqual({
                completed: 3,
                total: 3,
                percentage: 100,
                missingFields: [],
            });
        });

        it('should identify missing fields in progress', async () => {
            const mockUser = {
                id: 'user-123',
                firstName: 'John',
                lastName: 'Doe',
                email: '',
                phone: '',
                language: Language.EN,
                authProvider: AuthProvider.PARA,
                authProviderId: 'para-user-id',
                isActive: true,
                verificationStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycStatus: UserVerificationStatus.PENDING_VERIFICATION,
                kycVerifiedAt: undefined,
                status: UserStatus.PENDING_VERIFICATION,
                verificationCompletedAt: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: undefined,
                wallets: [],
                sentTransactions: [],
                receivedTransactions: [],
                ownedContacts: [],
                contactReferences: [],
                onOffRamps: [],
                visaCard: null,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getKycCompletionProgress('user-123');

            expect(result).toEqual({
                completed: 1,
                total: 3,
                percentage: 33,
                missingFields: ['email', 'phoneNumber'],
            });
        });

        it('should handle user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.getKycCompletionProgress('non-existent-user')).rejects.toThrow(
                'User not found'
            );
        });
    });
});
