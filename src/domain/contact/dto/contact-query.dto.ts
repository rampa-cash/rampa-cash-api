import { IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ContactQueryDto {
    @ApiPropertyOptional({ description: 'Filter by owner ID' })
    @IsOptional()
    @IsUUID()
    ownerId?: string;

    @ApiPropertyOptional({ description: 'Filter by contact user ID' })
    @IsOptional()
    @IsUUID()
    contactUserId?: string;

    @ApiPropertyOptional({ description: 'Filter by email' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ description: 'Filter by phone' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ description: 'Filter by display name' })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiPropertyOptional({ description: 'Filter by wallet address' })
    @IsOptional()
    @IsString()
    walletAddress?: string;

    @ApiPropertyOptional({ description: 'Filter by app user status' })
    @IsOptional()
    @IsBoolean()
    isAppUser?: boolean;

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
