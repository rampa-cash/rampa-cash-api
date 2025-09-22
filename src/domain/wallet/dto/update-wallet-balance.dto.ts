import { PartialType } from '@nestjs/mapped-types';
import { CreateWalletBalanceDto } from './create-wallet-balance.dto';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWalletBalanceDto extends PartialType(CreateWalletBalanceDto) {
    @ApiPropertyOptional({ description: 'Token balance', minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    balance?: number;
}
