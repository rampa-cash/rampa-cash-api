import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsEnum,
    IsDateString,
    IsNumber,
    IsPositive,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TokenType } from '../../common/enums/token-type.enum';

export class TransactionHistoryQueryDto {
    @ApiPropertyOptional({ description: 'Wallet ID to filter by' })
    @IsOptional()
    @IsString()
    walletId?: string;

    @ApiPropertyOptional({
        description: 'Transaction status to filter by',
        enum: TransactionStatus,
    })
    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @ApiPropertyOptional({
        description: 'Token type to filter by',
        enum: TokenType,
    })
    @IsOptional()
    @IsEnum(TokenType)
    tokenType?: TokenType;

    @ApiPropertyOptional({
        description: 'Start date for filtering (ISO string)',
    })
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @ApiPropertyOptional({ description: 'End date for filtering (ISO string)' })
    @IsOptional()
    @IsDateString()
    toDate?: string;

    @ApiPropertyOptional({
        description: 'Maximum number of results',
        minimum: 1,
        maximum: 100,
        default: 50,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @ApiPropertyOptional({
        description: 'Number of results to skip',
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    offset?: number = 0;

    @ApiPropertyOptional({
        description: 'Field to order by',
        enum: ['createdAt', 'amount', 'status'],
        default: 'createdAt',
    })
    @IsOptional()
    @IsString()
    orderBy?: 'createdAt' | 'amount' | 'status' = 'createdAt';

    @ApiPropertyOptional({
        description: 'Order direction',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    })
    @IsOptional()
    @IsString()
    orderDirection?: 'ASC' | 'DESC' = 'DESC';
}

export class TransactionHistoryResponseDto {
    @ApiProperty({ description: 'Array of transactions' })
    transactions: any[]; // This would be the actual Transaction entity DTO

    @ApiProperty({
        description: 'Total number of transactions matching the query',
    })
    total: number;

    @ApiProperty({ description: 'Number of results returned' })
    count: number;

    @ApiProperty({ description: 'Current page offset' })
    offset: number;

    @ApiProperty({ description: 'Whether there are more results available' })
    hasMore: boolean;
}

export class TransactionHistorySummaryDto {
    @ApiProperty({ description: 'Total number of transactions' })
    totalTransactions: number;

    @ApiProperty({ description: 'Total amount sent' })
    totalSent: number;

    @ApiProperty({ description: 'Total amount received' })
    totalReceived: number;

    @ApiProperty({ description: 'Total fees paid' })
    totalFees: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({
        description: 'Most active token type',
        enum: TokenType,
    })
    mostActiveToken: TokenType;

    @ApiProperty({ description: 'Recent activity transactions' })
    recentActivity: any[]; // This would be the actual Transaction entity DTO
}

export class SentTransactionSummaryDto {
    @ApiProperty({ description: 'Total amount sent' })
    totalSent: number;

    @ApiProperty({ description: 'Total fees paid' })
    totalFees: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Number of pending transactions' })
    pendingTransactions: number;

    @ApiProperty({ description: 'Number of failed transactions' })
    failedTransactions: number;

    @ApiProperty({
        description: 'Most used token type',
        enum: TokenType,
    })
    mostUsedToken: TokenType;

    @ApiProperty({ description: 'Recent sent transactions' })
    recentTransactions: any[]; // This would be the actual Transaction entity DTO
}

export class ReceivedTransactionSummaryDto {
    @ApiProperty({ description: 'Total amount received' })
    totalReceived: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Number of pending transactions' })
    pendingTransactions: number;

    @ApiProperty({ description: 'Number of failed transactions' })
    failedTransactions: number;

    @ApiProperty({
        description: 'Most received token type',
        enum: TokenType,
    })
    mostReceivedToken: TokenType;

    @ApiProperty({ description: 'Recent received transactions' })
    recentTransactions: any[]; // This would be the actual Transaction entity DTO
}

export class TransactionStatisticsDto {
    @ApiProperty({ description: 'Statistics period' })
    period: string;

    @ApiProperty({ description: 'Total number of transactions' })
    totalTransactions: number;

    @ApiProperty({ description: 'Total transaction volume' })
    totalVolume: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Top tokens by usage' })
    topTokens: Array<{
        token: TokenType;
        count: number;
        volume: number;
    }>;
}

export class SentTransactionStatisticsDto {
    @ApiProperty({ description: 'Statistics period' })
    period: string;

    @ApiProperty({ description: 'Total amount sent' })
    totalSent: number;

    @ApiProperty({ description: 'Total fees paid' })
    totalFees: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Number of transactions' })
    transactionCount: number;

    @ApiProperty({ description: 'Top recipients by volume' })
    topRecipients: Array<{
        address: string;
        count: number;
        totalAmount: number;
    }>;
}

export class ReceivedTransactionStatisticsDto {
    @ApiProperty({ description: 'Statistics period' })
    period: string;

    @ApiProperty({ description: 'Total amount received' })
    totalReceived: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Number of transactions' })
    transactionCount: number;

    @ApiProperty({ description: 'Top senders by volume' })
    topSenders: Array<{
        address: string;
        count: number;
        totalAmount: number;
    }>;
}

export class TransactionHistoryStatsDto {
    @ApiProperty({ description: 'Total number of transactions' })
    totalTransactions: number;

    @ApiProperty({ description: 'Total transaction volume' })
    totalVolume: number;

    @ApiProperty({ description: 'Average transaction value' })
    averageTransactionValue: number;

    @ApiProperty({ description: 'Success rate percentage' })
    successRate: number;

    @ApiProperty({ description: 'Token breakdown statistics' })
    tokenBreakdown: Record<TokenType, { count: number; volume: number }>;

    @ApiProperty({ description: 'Status breakdown statistics' })
    statusBreakdown: Record<TransactionStatus, number>;

    @ApiProperty({ description: 'Daily volume for the last 30 days' })
    dailyVolume: Array<{ date: string; volume: number; count: number }>;
}

export class TransactionSearchDto {
    @ApiProperty({ description: 'Address to search for' })
    @IsString()
    address: string;

    @ApiPropertyOptional({
        description: 'Maximum number of results',
        minimum: 1,
        maximum: 100,
        default: 50,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    @Min(1)
    @Max(100)
    limit?: number = 50;
}

export class MarkTransactionsAsReadDto {
    @ApiProperty({
        description: 'Array of transaction IDs to mark as read',
        type: [String],
    })
    @IsString({ each: true })
    transactionIds: string[];
}

export class TransactionHistoryPeriodDto {
    @ApiPropertyOptional({
        description: 'Statistics period',
        enum: ['day', 'week', 'month', 'year'],
        default: 'month',
    })
    @IsOptional()
    @IsEnum(['day', 'week', 'month', 'year'])
    period?: 'day' | 'week' | 'month' | 'year' = 'month';
}
