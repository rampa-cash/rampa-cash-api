import {
    IsOptional,
    IsEnum,
    IsUUID,
    IsString,
    IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardType, CardStatus } from '../entities/visa-card.entity';

export class VisaCardQueryDto {
    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by card type', enum: CardType })
    @IsOptional()
    @IsEnum(CardType)
    cardType?: CardType;

    @ApiPropertyOptional({
        description: 'Filter by card status',
        enum: CardStatus,
    })
    @IsOptional()
    @IsEnum(CardStatus)
    status?: CardStatus;

    @ApiPropertyOptional({ description: 'Filter by card number' })
    @IsOptional()
    @IsString()
    cardNumber?: string;

    @ApiPropertyOptional({ description: 'Filter by minimum balance' })
    @IsOptional()
    minBalance?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum balance' })
    @IsOptional()
    maxBalance?: number;

    @ApiPropertyOptional({ description: 'Filter by minimum daily limit' })
    @IsOptional()
    minDailyLimit?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum daily limit' })
    @IsOptional()
    maxDailyLimit?: number;

    @ApiPropertyOptional({ description: 'Filter by minimum monthly limit' })
    @IsOptional()
    minMonthlyLimit?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum monthly limit' })
    @IsOptional()
    maxMonthlyLimit?: number;

    @ApiPropertyOptional({
        description: 'Filter by activation date from (ISO string)',
    })
    @IsOptional()
    @IsDateString()
    activatedFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by activation date to (ISO string)',
    })
    @IsOptional()
    @IsDateString()
    activatedTo?: string;

    @ApiPropertyOptional({
        description: 'Filter by expiration date from (ISO string)',
    })
    @IsOptional()
    @IsDateString()
    expiresFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter by expiration date to (ISO string)',
    })
    @IsOptional()
    @IsDateString()
    expiresTo?: string;

    @ApiPropertyOptional({
        description: 'Page number for pagination',
        default: 1,
    })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        default: 10,
    })
    @IsOptional()
    limit?: number;
}
