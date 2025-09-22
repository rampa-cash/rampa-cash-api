import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWaitlistInquiryDto {
    @ApiProperty({
        description: 'Full name of the person joining the waitlist',
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
        description: 'Optional message or reason for joining waitlist',
        example: 'I am interested in early access to your services',
    })
    @IsOptional()
    @IsString()
    inquiry?: string;

    @ApiProperty({
        description: 'Type of inquiry - automatically set to WAITLIST',
        example: 'WAITLIST',
        enum: ['WAITLIST'],
        default: 'WAITLIST',
    })
    @IsString()
    type: 'WAITLIST';
}
