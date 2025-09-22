import { IsUUID, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenType } from '../entities/onoff-ramp.entity';

export class CreateOffRampDto {
    @ApiProperty({ description: 'User ID' })
    @IsUUID()
    userId: string;

    @ApiProperty({ description: 'Wallet ID' })
    @IsUUID()
    walletId: string;

    @ApiProperty({ description: 'Token amount to sell', minimum: 0.00000001 })
    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @ApiProperty({ description: 'Fiat amount to receive', minimum: 0.01 })
    @IsNumber()
    @Min(0.01)
    fiatAmount: number;

    @ApiProperty({ description: 'Fiat currency code (e.g., USD, EUR)' })
    @IsString()
    fiatCurrency: string;

    @ApiProperty({ description: 'Token type to sell', enum: TokenType })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiProperty({ description: 'Off-ramp provider (e.g., stripe, sepa)' })
    @IsString()
    provider: string;

    @ApiProperty({ description: 'Exchange rate for the conversion' })
    @IsNumber()
    @Min(0.00000001)
    exchangeRate: number;

    @ApiPropertyOptional({ description: 'Transaction fee', minimum: 0, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    fee?: number;
}
