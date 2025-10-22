import {
    IsEmail,
    IsOptional,
    IsString,
    Length,
    IsPhoneNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteProfileDto {
    @ApiPropertyOptional({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({
        description: 'User phone number',
        example: '+1234567890',
    })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @ApiPropertyOptional({
        description: 'User first name',
        example: 'John',
        minLength: 1,
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    firstName?: string;

    @ApiPropertyOptional({
        description: 'User last name',
        example: 'Doe',
        minLength: 1,
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    lastName?: string;
}
