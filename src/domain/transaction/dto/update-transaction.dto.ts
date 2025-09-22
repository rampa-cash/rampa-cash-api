import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../entities/transaction.entity';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
    @ApiPropertyOptional({ description: 'Transaction status', enum: TransactionStatus })
    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @ApiPropertyOptional({ description: 'Solana transaction hash' })
    @IsOptional()
    @IsString()
    solanaTransactionHash?: string;

    @ApiPropertyOptional({ description: 'Failure reason if transaction failed' })
    @IsOptional()
    @IsString()
    failureReason?: string;
}
