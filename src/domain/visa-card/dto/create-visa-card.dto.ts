import { IsUUID, IsString, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CardType } from '../entities/visa-card.entity';

export class CreateVisaCardDto {
    @ApiProperty({ description: 'User ID' })
    @IsUUID()
    userId: string;

    @ApiProperty({ description: 'Card number' })
    @IsString()
    cardNumber: string;

    @ApiProperty({ description: 'Card type', enum: CardType })
    @IsEnum(CardType)
    cardType: CardType;

    @ApiProperty({ description: 'Daily spending limit', minimum: 0.01 })
    @IsNumber()
    @Min(0.01)
    dailyLimit: number;

    @ApiProperty({ description: 'Monthly spending limit', minimum: 0.01 })
    @IsNumber()
    @Min(0.01)
    monthlyLimit: number;

    @ApiProperty({ description: 'Card expiration date (ISO string)' })
    @IsDateString()
    expiresAt: string;
}
