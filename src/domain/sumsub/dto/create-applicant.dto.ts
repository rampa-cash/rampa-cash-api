import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { VerificationSource } from '../entities/sumsub-applicant.entity';

export class CreateApplicantDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsEnum(VerificationSource)
    source?: VerificationSource;

    @IsOptional()
    metadata?: Record<string, any>;
}
