import {
    IsEnum,
    IsString,
    IsOptional,
    IsNumber,
    Min,
    IsBoolean,
    IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RampType {
    BUY = 'BUY',
    SELL = 'SELL',
}

export class GetTransakWidgetUrlDto {
    @ApiProperty({
        description: 'Type of ramp operation',
        enum: RampType,
        example: RampType.BUY,
    })
    @IsEnum(RampType)
    rampType: RampType;

    @ApiPropertyOptional({
        description: 'Fiat currency code (USD, EUR, GBP, etc.)',
        example: 'USD',
    })
    @IsOptional()
    @IsString()
    fiatCurrency?: string;

    @ApiPropertyOptional({
        description:
            'Fiat amount to lock (user cannot edit). Required for hideExchangeScreen on BUY operations.',
        example: 100,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    fiatAmount?: number;

    @ApiPropertyOptional({
        description:
            'Crypto amount to lock (user cannot edit). Required for hideExchangeScreen on SELL operations.',
        example: 50,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cryptoAmount?: number;

    @ApiPropertyOptional({
        description:
            'Payment method to lock. Options: "bank" (SEPA bank transfer) or "card" (credit/debit card). Required for hideExchangeScreen.',
        example: 'bank',
        enum: ['bank', 'card'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['bank', 'card'])
    paymentMethod?: string;

    @ApiPropertyOptional({
        description:
            'Skip the exchange screen. For BUY: requires fiatAmount, fiatCurrency, paymentMethod, rampType, network (solana), and cryptoCurrencyCode (USDC). For SELL: requires cryptoAmount, fiatCurrency, paymentMethod, rampType, network (solana), and cryptoCurrencyCode (USDC).',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    hideExchangeScreen?: boolean;

    @ApiPropertyOptional({
        description:
            'Theme mode to match mobile app. Options: "LIGHT" or "DARK".',
        example: 'DARK',
        enum: ['LIGHT', 'DARK'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['LIGHT', 'DARK'])
    themeMode?: 'LIGHT' | 'DARK';

    @ApiPropertyOptional({
        description:
            'Manual country override (ISO country code). If provided, overrides automatic country detection.',
        example: 'DE',
    })
    @IsOptional()
    @IsString()
    manualCountryOverride?: string;
}
