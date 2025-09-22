import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryType } from '../entities/inquiry.entity';

export class CreateInquiryDto {
    @ApiProperty({
        description: 'Full name of the person making the inquiry',
        example: 'John Doe',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Email address',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({
        description: 'Optional inquiry message or question',
        example: 'I would like to know more about your services',
    })
    @IsOptional()
    @IsString()
    inquiry?: string;

    @ApiPropertyOptional({
        description: 'Type of inquiry',
        enum: InquiryType,
        example: InquiryType.GENERAL,
    })
    @IsOptional()
    @IsEnum(InquiryType)
    type?: InquiryType;
}
