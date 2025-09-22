import {
    IsEmail,
    IsOptional,
    IsString,
    IsEnum,
    IsBoolean,
    Length,
    IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, Language } from '../entities/user.entity';

export class CreateUserDto {
    @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ description: 'User phone number', example: '+1234567890' })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty({ description: 'User first name', example: 'John', minLength: 1, maxLength: 50 })
    @IsString()
    @Length(1, 50)
    firstName: string;

    @ApiProperty({ description: 'User last name', example: 'Doe', minLength: 1, maxLength: 50 })
    @IsString()
    @Length(1, 50)
    lastName: string;

    @ApiProperty({ description: 'User preferred language', enum: Language, example: Language.EN })
    @IsEnum(Language)
    language: Language;

    @ApiProperty({ description: 'Authentication provider', enum: AuthProvider, example: AuthProvider.GOOGLE })
    @IsEnum(AuthProvider)
    authProvider: AuthProvider;

    @ApiProperty({ description: 'Authentication provider ID', example: 'auth_provider_123' })
    @IsString()
    authProviderId: string;

    @ApiPropertyOptional({ description: 'Whether the user is active', example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
