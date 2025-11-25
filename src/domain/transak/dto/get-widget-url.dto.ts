import { IsEnum, IsString, IsOptional, IsNumber, Min } from 'class-validator';
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
        description: 'Cryptocurrency code (SOL, USDC, EURC)',
        example: 'SOL',
    })
    @IsOptional()
    @IsString()
    cryptoCurrency?: string;

    @ApiPropertyOptional({
        description: 'Fiat currency code (USD, EUR, GBP, etc.)',
        example: 'USD',
    })
    @IsOptional()
    @IsString()
    fiatCurrency?: string;

    @ApiPropertyOptional({
        description: 'Default amount (fiat for BUY, crypto for SELL)',
        example: 100,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    defaultAmount?: number;

    @ApiPropertyOptional({
        description:
            'Manual country override (ISO country code). If provided, overrides automatic country detection.',
        example: 'DE',
    })
    @IsOptional()
    @IsString()
    manualCountryOverride?: string;
}
