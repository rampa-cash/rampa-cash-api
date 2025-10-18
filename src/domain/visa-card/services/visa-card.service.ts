import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VISACard, CardStatus } from '../entities/visa-card.entity';
import { CreateVisaCardDto, UpdateVisaCardDto } from '../dto';

@Injectable()
export class VISACardService {
    constructor(
        @InjectRepository(VISACard)
        private visaCardRepository: Repository<VISACard>,
    ) {}

    async create(createVisaCardDto: CreateVisaCardDto): Promise<VISACard> {
        const {
            userId,
            cardNumber,
            cardType,
            dailyLimit,
            monthlyLimit,
            expiresAt,
        } = createVisaCardDto;

        // Check if user already has an active card
        const existingCard = await this.visaCardRepository.findOne({
            where: { userId, status: CardStatus.ACTIVE },
        });

        if (existingCard) {
            throw new ConflictException('User already has an active VISA card');
        }

        // Validate limits
        if (dailyLimit <= 0) {
            throw new BadRequestException('Daily limit must be positive');
        }

        if (monthlyLimit <= 0) {
            throw new BadRequestException('Monthly limit must be positive');
        }

        if (dailyLimit > monthlyLimit) {
            throw new BadRequestException(
                'Daily limit cannot exceed monthly limit',
            );
        }

        // Validate expiration date
        const expirationDate = new Date(expiresAt);
        if (expirationDate <= new Date()) {
            throw new BadRequestException(
                'Expiration date must be in the future',
            );
        }

        const visaCard = this.visaCardRepository.create({
            userId,
            cardNumber,
            cardType,
            dailyLimit,
            monthlyLimit,
            expiresAt,
            status: CardStatus.PENDING,
            balance: 0,
        });

        return await this.visaCardRepository.save(visaCard);
    }

    async findAll(): Promise<VISACard[]> {
        return await this.visaCardRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<VISACard> {
        const visaCard = await this.visaCardRepository.findOne({
            where: { id },
            relations: ['user'],
        });

        if (!visaCard) {
            throw new NotFoundException(`VISA card with ID ${id} not found`);
        }

        return visaCard;
    }

    async findByUserId(userId: string): Promise<VISACard | null> {
        return await this.visaCardRepository.findOne({
            where: { userId },
            relations: ['user'],
        });
    }

    async findByCardNumber(cardNumber: string): Promise<VISACard | null> {
        return await this.visaCardRepository.findOne({
            where: { cardNumber },
            relations: ['user'],
        });
    }

    async findByStatus(status: CardStatus): Promise<VISACard[]> {
        return await this.visaCardRepository.find({
            where: { status },
            relations: ['user'],
        });
    }

    async update(
        id: string,
        updateVisaCardDto: UpdateVisaCardDto,
    ): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        // Validate limits if being updated
        if (updateVisaCardDto.dailyLimit !== undefined) {
            if (updateVisaCardDto.dailyLimit <= 0) {
                throw new BadRequestException('Daily limit must be positive');
            }
            if (updateVisaCardDto.monthlyLimit !== undefined) {
                if (
                    updateVisaCardDto.dailyLimit >
                    updateVisaCardDto.monthlyLimit
                ) {
                    throw new BadRequestException(
                        'Daily limit cannot exceed monthly limit',
                    );
                }
            } else if (updateVisaCardDto.dailyLimit > visaCard.monthlyLimit) {
                throw new BadRequestException(
                    'Daily limit cannot exceed monthly limit',
                );
            }
        }

        if (updateVisaCardDto.monthlyLimit !== undefined) {
            if (updateVisaCardDto.monthlyLimit <= 0) {
                throw new BadRequestException('Monthly limit must be positive');
            }
            const dailyLimit =
                updateVisaCardDto.dailyLimit ?? visaCard.dailyLimit;
            if (dailyLimit > updateVisaCardDto.monthlyLimit) {
                throw new BadRequestException(
                    'Daily limit cannot exceed monthly limit',
                );
            }
        }

        Object.assign(visaCard, updateVisaCardDto);
        return await this.visaCardRepository.save(visaCard);
    }

    async activate(id: string): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        if (visaCard.status !== CardStatus.PENDING) {
            throw new BadRequestException(
                'Only pending cards can be activated',
            );
        }

        visaCard.status = CardStatus.ACTIVE;
        visaCard.activatedAt = new Date();

        return await this.visaCardRepository.save(visaCard);
    }

    async suspend(id: string): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        if (visaCard.status !== CardStatus.ACTIVE) {
            throw new BadRequestException('Only active cards can be suspended');
        }

        visaCard.status = CardStatus.SUSPENDED;
        return await this.visaCardRepository.save(visaCard);
    }

    async reactivate(id: string): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        if (visaCard.status !== CardStatus.SUSPENDED) {
            throw new BadRequestException(
                'Only suspended cards can be reactivated',
            );
        }

        visaCard.status = CardStatus.ACTIVE;
        return await this.visaCardRepository.save(visaCard);
    }

    async cancel(id: string): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        if (visaCard.status === CardStatus.CANCELLED) {
            throw new BadRequestException('Card is already cancelled');
        }

        visaCard.status = CardStatus.CANCELLED;
        return await this.visaCardRepository.save(visaCard);
    }

    async updateBalance(id: string, amount: number): Promise<VISACard> {
        const visaCard = await this.findOne(id);

        if (visaCard.status !== CardStatus.ACTIVE) {
            throw new BadRequestException(
                'Only active cards can have their balance updated',
            );
        }

        const newBalance = visaCard.balance + amount;

        if (newBalance < 0) {
            throw new BadRequestException('Insufficient card balance');
        }

        visaCard.balance = newBalance;
        return await this.visaCardRepository.save(visaCard);
    }

    async checkSpendingLimits(
        id: string,
        amount: number,
    ): Promise<{
        canSpend: boolean;
        dailyRemaining: number;
        monthlyRemaining: number;
    }> {
        const visaCard = await this.findOne(id);

        if (visaCard.status !== CardStatus.ACTIVE) {
            return {
                canSpend: false,
                dailyRemaining: 0,
                monthlyRemaining: 0,
            };
        }

        // Check if card is expired
        if (visaCard.expiresAt <= new Date()) {
            return {
                canSpend: false,
                dailyRemaining: 0,
                monthlyRemaining: 0,
            };
        }

        // For simplicity, we'll assume daily and monthly limits reset based on creation date
        // In a real implementation, you'd track daily/monthly spending separately
        const dailyRemaining = visaCard.dailyLimit;
        const monthlyRemaining = visaCard.monthlyLimit;

        const canSpend = amount <= dailyRemaining && amount <= monthlyRemaining;

        return {
            canSpend,
            dailyRemaining,
            monthlyRemaining,
        };
    }

    async getExpiredCards(): Promise<VISACard[]> {
        return await this.visaCardRepository
            .createQueryBuilder('visaCard')
            .where('visaCard.expiresAt <= :now', { now: new Date() })
            .andWhere('visaCard.status IN (:...statuses)', {
                statuses: [CardStatus.ACTIVE, CardStatus.SUSPENDED],
            })
            .getMany();
    }

    async getCardStats(userId?: string): Promise<{
        totalCards: number;
        activeCards: number;
        suspendedCards: number;
        cancelledCards: number;
        expiredCards: number;
    }> {
        const queryBuilder =
            this.visaCardRepository.createQueryBuilder('visaCard');

        if (userId) {
            queryBuilder.where('visaCard.userId = :userId', { userId });
        }

        const cards = await queryBuilder.getMany();

        const stats = cards.reduce(
            (acc, card) => {
                acc.totalCards++;

                if (card.status === CardStatus.ACTIVE) {
                    acc.activeCards++;
                } else if (card.status === CardStatus.SUSPENDED) {
                    acc.suspendedCards++;
                } else if (card.status === CardStatus.CANCELLED) {
                    acc.cancelledCards++;
                }

                if (card.expiresAt <= new Date()) {
                    acc.expiredCards++;
                }

                return acc;
            },
            {
                totalCards: 0,
                activeCards: 0,
                suspendedCards: 0,
                cancelledCards: 0,
                expiredCards: 0,
            },
        );

        return stats;
    }
}
