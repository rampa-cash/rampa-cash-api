import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TokenType } from '../entities/wallet-balance.entity';

export class WalletBalanceQueryDto {
    @ApiPropertyOptional({ description: 'Filter by wallet ID' })
    @IsOptional()
    @IsUUID()
    walletId?: string;

    @ApiPropertyOptional({
        description: 'Filter by token type',
        enum: TokenType,
    })
    @IsOptional()
    @IsEnum(TokenType)
    tokenType?: TokenType;

    @ApiPropertyOptional({ description: 'Filter by minimum balance' })
    @IsOptional()
    minBalance?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum balance' })
    @IsOptional()
    maxBalance?: number;

    @ApiPropertyOptional({
        description: 'Page number for pagination',
        default: 1,
    })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        default: 10,
    })
    @IsOptional()
    limit?: number;
}
