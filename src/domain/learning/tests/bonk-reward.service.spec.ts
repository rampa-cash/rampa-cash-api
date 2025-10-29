import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BonkRewardService } from '../services/bonk-reward.service';
import { BonkReward, RewardStatus } from '../entities/bonk-reward.entity';

describe('BonkRewardService', () => {
    let service: BonkRewardService;
    let rewardRepository: Repository<BonkReward>;

    const mockReward = {
        id: 'reward-1',
        userId: 'user-1',
        moduleId: 'module-1',
        amount: 1000,
        status: RewardStatus.PENDING,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BonkRewardService,
                {
                    provide: getRepositoryToken(BonkReward),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(() => ({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            select: jest.fn().mockReturnThis(),
                            groupBy: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            getRawMany: jest.fn(),
                            getRawOne: jest.fn(),
                        })),
                    },
                },
            ],
        }).compile();

        service = module.get<BonkRewardService>(BonkRewardService);
        rewardRepository = module.get<Repository<BonkReward>>(
            getRepositoryToken(BonkReward),
        );
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createReward', () => {
        it('should create a new BONK reward', async () => {
            jest.mocked(rewardRepository.create).mockReturnValue(mockReward as any);
            jest.mocked(rewardRepository.save).mockResolvedValue(mockReward as any);

            const result = await service.createReward('user-1', 'module-1', 1000);

            expect(result).toBeDefined();
            expect(result.userId).toBe('user-1');
            expect(result.moduleId).toBe('module-1');
            expect(result.amount).toBe(1000);
            expect(result.status).toBe(RewardStatus.PENDING);
            expect(rewardRepository.create).toHaveBeenCalledWith({
                userId: 'user-1',
                moduleId: 'module-1',
                amount: 1000,
                status: RewardStatus.PENDING,
            });
        });
    });

    describe('getUserRewards', () => {
        it('should return user BONK rewards', async () => {
            jest.mocked(rewardRepository.find).mockResolvedValue([mockReward]);

            const result = await service.getUserRewards('user-1');

            expect(result).toHaveLength(1);
            expect(result[0].userId).toBe('user-1');
            expect(rewardRepository.find).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('getRewardsByStatus', () => {
        it('should return rewards filtered by status', async () => {
            jest.mocked(rewardRepository.find).mockResolvedValue([mockReward]);

            const result = await service.getRewardsByStatus(RewardStatus.PENDING);

            expect(result).toHaveLength(1);
            expect(result[0].status).toBe(RewardStatus.PENDING);
            expect(rewardRepository.find).toHaveBeenCalledWith({
                where: { status: RewardStatus.PENDING },
                order: { createdAt: 'DESC' },
            });
        });
    });

    describe('updateRewardStatus', () => {
        it('should update reward status', async () => {
            const updatedReward = { ...mockReward, status: RewardStatus.CONFIRMED };
            jest.mocked(rewardRepository.findOne).mockResolvedValue(mockReward as any);
            jest.mocked(rewardRepository.save).mockResolvedValue(updatedReward as any);

            const result = await service.updateRewardStatus('reward-1', RewardStatus.CONFIRMED);

            expect(result).toBeDefined();
            expect(result.status).toBe(RewardStatus.CONFIRMED);
            expect(rewardRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: RewardStatus.CONFIRMED,
                }),
            );
        });

        it('should throw NotFoundException if reward not found', async () => {
            jest.mocked(rewardRepository.findOne).mockResolvedValue(null);

            await expect(
                service.updateRewardStatus('nonexistent', RewardStatus.CONFIRMED),
            ).rejects.toThrow('BONK reward with ID nonexistent not found');
        });
    });

    describe('getUserTotalRewards', () => {
        it('should return total BONK rewards for user', async () => {
            jest.mocked(rewardRepository.createQueryBuilder).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
            } as any);

            const result = await service.getUserTotalRewards('user-1');

            expect(result).toBe(5000);
        });
    });

    describe('getRewardStats', () => {
        it('should return reward statistics', async () => {
            jest.mocked(rewardRepository.count).mockResolvedValue(100);
            jest.mocked(rewardRepository.createQueryBuilder).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { status: 'pending', count: '50' },
                    { status: 'confirmed', count: '30' },
                    { status: 'failed', count: '20' },
                ]),
            } as any);

            const result = await service.getRewardStats();

            expect(result).toBeDefined();
            expect(result.totalRewards).toBe(100);
            expect(result.statusBreakdown).toHaveProperty('pending', 50);
            expect(result.statusBreakdown).toHaveProperty('confirmed', 30);
            expect(result.statusBreakdown).toHaveProperty('failed', 20);
        });
    });

    describe('processPendingRewards', () => {
        it('should process pending rewards', async () => {
            const pendingRewards = [
                { ...mockReward, id: 'reward-1' },
                { ...mockReward, id: 'reward-2' },
            ];
            jest.mocked(rewardRepository.find).mockResolvedValue(pendingRewards as any);
            jest.mocked(rewardRepository.save).mockResolvedValue(mockReward as any);

            const result = await service.processPendingRewards();

            expect(result).toBe(2);
            expect(rewardRepository.save).toHaveBeenCalledTimes(2);
        });
    });

    describe('getTopEarners', () => {
        it('should return top BONK earners', async () => {
            jest.mocked(rewardRepository.createQueryBuilder).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { userId: 'user-1', total: '10000' },
                    { userId: 'user-2', total: '8000' },
                ]),
            } as any);

            const result = await service.getTopEarners(10);

            expect(result).toHaveLength(2);
            expect(result[0].userId).toBe('user-1');
            expect(result[0].total).toBe(10000);
        });
    });
});
