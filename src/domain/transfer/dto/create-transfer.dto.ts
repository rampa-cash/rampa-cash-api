import {
    IsString,
    IsNumber,
    IsEnum,
    IsOptional,
    Min,
    IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenType } from '../../common/enums/token-type.enum';

export class CreateTransferDto {
    @ApiPropertyOptional({
        description: 'Sender wallet address (optional - will use authenticated user\'s wallet if not provided)',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsOptional()
    @IsString()
    fromAddress?: string;

    @ApiProperty({
        description: 'Recipient wallet address',
        example: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm',
    })
    @IsString()
    @IsNotEmpty()
    toAddress: string;

    @ApiProperty({
        description: 'Transfer amount',
        example: 100.5,
        minimum: 0.000001,
    })
    @IsNumber({ maxDecimalPlaces: 6 })
    @Min(0.000001)
    amount: number;

    @ApiProperty({
        description: 'Token type to transfer',
        enum: TokenType,
        example: TokenType.USDC,
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiPropertyOptional({
        description: 'Optional memo for the transfer',
        example: 'Payment for services',
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    memo?: string;
}
