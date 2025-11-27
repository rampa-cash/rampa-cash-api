import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ValidatePhoneNumbersDto {
    @ApiProperty({
        description: 'Lista de numeros de telefono a validar',
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    phoneNumbers: string[];
}
