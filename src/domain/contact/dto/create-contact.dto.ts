import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ContactType } from '../entities/contact.entity';

export class CreateContactDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    inquiry?: string;

    @IsOptional()
    @IsEnum(ContactType)
    type?: ContactType;
}
