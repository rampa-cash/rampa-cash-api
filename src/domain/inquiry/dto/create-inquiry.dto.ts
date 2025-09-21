import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { InquiryType } from '../entities/inquiry.entity';

export class CreateInquiryDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    inquiry?: string;

    @IsOptional()
    @IsEnum(InquiryType)
    type?: InquiryType;
}
