import { IsOptional, IsEnum, IsUUID, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus, TokenType } from '../entities/transaction.entity';

export class TransactionQueryDto {
    @ApiPropertyOptional({ description: 'Filter by user ID (sender or recipient)' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by sender ID' })
    @IsOptional()
    @IsUUID()
    senderId?: string;

    @ApiPropertyOptional({ description: 'Filter by recipient ID' })
    @IsOptional()
    @IsUUID()
    recipientId?: string;

    @ApiPropertyOptional({ description: 'Filter by sender wallet ID' })
    @IsOptional()
    @IsUUID()
    senderWalletId?: string;

    @ApiPropertyOptional({ description: 'Filter by recipient wallet ID' })
    @IsOptional()
    @IsUUID()
    recipientWalletId?: string;

    @ApiPropertyOptional({ description: 'Filter by transaction status', enum: TransactionStatus })
    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @ApiPropertyOptional({ description: 'Filter by token type', enum: TokenType })
    @IsOptional()
    @IsEnum(TokenType)
    tokenType?: TokenType;

    @ApiPropertyOptional({ description: 'Filter by Solana transaction hash' })
    @IsOptional()
    @IsString()
    solanaTransactionHash?: string;

    @ApiPropertyOptional({ description: 'Filter by minimum amount' })
    @IsOptional()
    minAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum amount' })
    @IsOptional()
    maxAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by date from (ISO string)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by date to (ISO string)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Filter by start date (legacy)' })
    @IsOptional()
    startDate?: Date;

    @ApiPropertyOptional({ description: 'Filter by end date (legacy)' })
    @IsOptional()
    endDate?: Date;

    @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Offset for pagination (legacy)' })
    @IsOptional()
    offset?: number;
}
