import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCreationService } from '../../../../src/domain/user/services/user-creation.service';
import { User, AuthProvider, KycStatus } from '../../../../src/domain/user/entities/user.entity';

describe('UserCreationService', () => {
    let service: UserCreationService;
    let userRepository: Repository<User>;

    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreationService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<UserCreationService>(UserCreationService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createUserFromSession', () => {
        const mockSessionData = {
            userId: 'session-user-123',
            email: 'test@example.com',
            name: 'Test User',
            phoneNumber: '+1234567890',
            authProvider: 'PARA' as const,
            expiresAt: new Date(Date.now() + 3600000),
        };

        it('should create user successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findOne.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);

            const result = await service.createUserFromSession(mockSessionData);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                name: 'Test User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
            });
            expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
        });

        it('should handle existing user', async () => {
            const existingUser = {
                id: 'existing-user-123',
                email: 'test@example.com',
                name: 'Existing User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.COMPLETED,
                kycVerifiedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findOne.mockResolvedValue(existingUser);

            const result = await service.createUserFromSession(mockSessionData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User already exists with this email');
            expect(mockUserRepository.create).not.toHaveBeenCalled();
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);
            mockUserRepository.create.mockReturnValue({});
            mockUserRepository.save.mockRejectedValue(new Error('Database error'));

            const result = await service.createUserFromSession(mockSessionData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to create user: Database error');
        });
    });

    describe('updateUserFromSession', () => {
        const mockSessionData = {
            userId: 'session-user-123',
            email: 'updated@example.com',
            name: 'Updated User',
            phoneNumber: '+9876543210',
            authProvider: 'EMAIL' as const,
            expiresAt: new Date(Date.now() + 3600000),
        };

        it('should update user successfully', async () => {
            const existingUser = {
                id: 'user-123',
                email: 'old@example.com',
                name: 'Old Name',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const updatedUser = {
                ...existingUser,
                email: 'updated@example.com',
                name: 'Updated User',
                phoneNumber: '+9876543210',
                authProvider: AuthProvider.EMAIL,
            };

            mockUserRepository.findOne.mockResolvedValue(existingUser);
            mockUserRepository.save.mockResolvedValue(updatedUser);

            const result = await service.updateUserFromSession('user-123', mockSessionData);

            expect(result.success).toBe(true);
            expect(result.user).toEqual(updatedUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
            });
            expect(mockUserRepository.save).toHaveBeenCalledWith(updatedUser);
        });

        it('should handle user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.updateUserFromSession('non-existent-user', mockSessionData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            const existingUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findOne.mockResolvedValue(existingUser);
            mockUserRepository.save.mockRejectedValue(new Error('Database error'));

            const result = await service.updateUserFromSession('user-123', mockSessionData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to update user: Database error');
        });
    });

    describe('getUserByEmail', () => {
        it('should return user by email', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getUserByEmail('test@example.com');

            expect(result).toEqual(mockUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.getUserByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('getUserById', () => {
        it('should return user by id', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                phoneNumber: '+1234567890',
                authProvider: AuthProvider.PARA,
                kycStatus: KycStatus.PENDING,
                kycVerifiedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getUserById('user-123');

            expect(result).toEqual(mockUser);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'user-123' },
            });
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.getUserById('non-existent-user');

            expect(result).toBeNull();
        });
    });
});
