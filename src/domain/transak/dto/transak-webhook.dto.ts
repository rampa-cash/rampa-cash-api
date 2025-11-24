import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransakOrderStatus {
    ORDER_CREATED = 'ORDER_CREATED',
    ORDER_PROCESSING = 'ORDER_PROCESSING',
    ORDER_PAYMENT_VERIFYING = 'ORDER_PAYMENT_VERIFYING',
    ORDER_COMPLETED = 'ORDER_COMPLETED',
    ORDER_FAILED = 'ORDER_FAILED',
    ORDER_CANCELLED = 'ORDER_CANCELLED',
}

export enum TransakBuyOrSell {
    BUY = 'BUY',
    SELL = 'SELL',
}

export class TransakWebhookDataDto {
    @ApiProperty({ description: 'Transak order ID' })
    @IsString()
    id: string;

    @ApiProperty({ description: 'Order status', enum: TransakOrderStatus })
    @IsEnum(TransakOrderStatus)
    status: TransakOrderStatus;

    @ApiPropertyOptional({ description: 'Your user ID (partnerCustomerId)' })
    @IsOptional()
    @IsString()
    partnerCustomerId?: string;

    @ApiProperty({ description: 'Wallet address' })
    @IsString()
    walletAddress: string;

    @ApiProperty({ description: 'Cryptocurrency code' })
    @IsString()
    cryptocurrency: string;

    @ApiProperty({ description: 'Crypto amount' })
    @IsNumber()
    cryptoAmount: number;

    @ApiProperty({ description: 'Fiat currency code' })
    @IsString()
    fiatCurrency: string;

    @ApiProperty({ description: 'Fiat amount' })
    @IsNumber()
    fiatAmount: number;

    @ApiProperty({ description: 'Buy or sell', enum: TransakBuyOrSell })
    @IsEnum(TransakBuyOrSell)
    isBuyOrSell: TransakBuyOrSell;

    @ApiPropertyOptional({ description: 'Payment option ID' })
    @IsOptional()
    @IsString()
    paymentOptionId?: string;

    @ApiPropertyOptional({ description: 'Blockchain transaction hash' })
    @IsOptional()
    @IsString()
    transactionHash?: string;

    @ApiProperty({ description: 'Order creation timestamp' })
    @IsString()
    createdAt: string;

    @ApiPropertyOptional({ description: 'Order completion timestamp' })
    @IsOptional()
    @IsString()
    completedAt?: string;
}

export class TransakWebhookDto {
    @ApiProperty({ description: 'Unique event ID for idempotency' })
    @IsString()
    eventID: string;

    @ApiProperty({ description: 'Webhook data', type: TransakWebhookDataDto })
    @ValidateNested()
    @Type(() => TransakWebhookDataDto)
    webhookData: TransakWebhookDataDto;
}
