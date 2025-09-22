import { IsEmail, IsOptional, IsString, IsEnum, Length, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, Language } from '../../user/entities/user.entity';

export class RegisterDto {
    @ApiProperty({ description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ description: 'User phone number' })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty({ description: 'User first name', minLength: 1, maxLength: 50 })
    @IsString()
    @Length(1, 50)
    firstName: string;

    @ApiProperty({ description: 'User last name', minLength: 1, maxLength: 50 })
    @IsString()
    @Length(1, 50)
    lastName: string;

    @ApiProperty({ description: 'User language preference', enum: Language, default: Language.EN })
    @IsEnum(Language)
    language: Language;

    @ApiProperty({ description: 'Authentication provider', enum: AuthProvider })
    @IsEnum(AuthProvider)
    authProvider: AuthProvider;

    @ApiProperty({ description: 'Authentication provider ID' })
    @IsString()
    authProviderId: string;
}
