import { IsUUID, IsOptional, IsString, IsBoolean, IsEmail, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
    @ApiProperty({ description: 'Owner user ID' })
    @IsUUID()
    ownerId: string;

    @ApiPropertyOptional({ description: 'Contact user ID if the contact is an app user' })
    @IsOptional()
    @IsUUID()
    contactUserId?: string;

    @ApiPropertyOptional({ description: 'Contact email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Contact phone number' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ description: 'Display name for the contact', minLength: 1, maxLength: 100 })
    @IsString()
    @Length(1, 100)
    displayName: string;

    @ApiPropertyOptional({ description: 'Wallet address for the contact' })
    @IsOptional()
    @IsString()
    walletAddress?: string;

    @ApiPropertyOptional({ description: 'Whether the contact is an app user', default: false })
    @IsOptional()
    @IsBoolean()
    isAppUser?: boolean;
}
