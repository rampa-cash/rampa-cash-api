import {
    IsOptional,
    IsEnum,
    IsUUID,
    IsString,
    IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RampStatus } from '../entities/onoff-ramp.entity';
import { TokenType } from '../../common/enums/token-type.enum';

export class OffRampQueryDto {
    @ApiPropertyOptional({ description: 'Filter by user ID' })
    @IsOptional()
    @IsUUID()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filter by wallet ID' })
    @IsOptional()
    @IsUUID()
    walletId?: string;

    @ApiPropertyOptional({ description: 'Filter by status', enum: RampStatus })
    @IsOptional()
    @IsEnum(RampStatus)
    status?: RampStatus;

    @ApiPropertyOptional({
        description: 'Filter by token type',
        enum: TokenType,
    })
    @IsOptional()
    @IsEnum(TokenType)
    tokenType?: TokenType;

    @ApiPropertyOptional({ description: 'Filter by provider' })
    @IsOptional()
    @IsString()
    provider?: string;

    @ApiPropertyOptional({ description: 'Filter by fiat currency' })
    @IsOptional()
    @IsString()
    fiatCurrency?: string;

    @ApiPropertyOptional({ description: 'Filter by minimum amount' })
    @IsOptional()
    minAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum amount' })
    @IsOptional()
    maxAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by minimum fiat amount' })
    @IsOptional()
    minFiatAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum fiat amount' })
    @IsOptional()
    maxFiatAmount?: number;

    @ApiPropertyOptional({ description: 'Filter by date from (ISO string)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by date to (ISO string)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

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
