import { PartialType } from '@nestjs/mapped-types';
import { CreateVisaCardDto } from './create-visa-card.dto';
import {
    IsOptional,
    IsEnum,
    IsNumber,
    IsDateString,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardStatus } from '../entities/visa-card.entity';

export class UpdateVisaCardDto extends PartialType(CreateVisaCardDto) {
    @ApiPropertyOptional({ description: 'Card status', enum: CardStatus })
    @IsOptional()
    @IsEnum(CardStatus)
    status?: CardStatus;

    @ApiPropertyOptional({ description: 'Card balance', minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    balance?: number;

    @ApiPropertyOptional({ description: 'Daily spending limit', minimum: 0.01 })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    dailyLimit?: number;

    @ApiPropertyOptional({
        description: 'Monthly spending limit',
        minimum: 0.01,
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    monthlyLimit?: number;

    @ApiPropertyOptional({ description: 'Card activation date (ISO string)' })
    @IsOptional()
    @IsDateString()
    activatedAt?: string;

    @ApiPropertyOptional({ description: 'Card expiration date (ISO string)' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
