import { IsEmail, IsOptional, IsString, IsEnum, IsBoolean, Length, IsPhoneNumber } from 'class-validator';
import { AuthProvider, Language } from '../entities/user.entity';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @IsString()
    @Length(1, 50)
    firstName: string;

    @IsString()
    @Length(1, 50)
    lastName: string;

    @IsEnum(Language)
    language: Language;

    @IsEnum(AuthProvider)
    authProvider: AuthProvider;

    @IsString()
    authProviderId: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}