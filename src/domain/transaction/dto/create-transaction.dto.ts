import {
    IsUUID,
    IsNumber,
    IsEnum,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenType } from '../../common/enums/token-type.enum';

export class CreateTransactionDto {
    @ApiProperty({ description: 'Sender user ID' })
    @IsUUID()
    senderId: string;

    @ApiProperty({ description: 'Recipient user ID' })
    @IsUUID()
    recipientId: string;

    @ApiProperty({ description: 'Sender wallet ID' })
    @IsUUID()
    senderWalletId: string;

    @ApiProperty({ description: 'Recipient wallet ID' })
    @IsUUID()
    recipientWalletId: string;

    @ApiProperty({ description: 'Transaction amount', minimum: 0.00000001 })
    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @ApiProperty({ description: 'Token type', enum: TokenType })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiPropertyOptional({ description: 'Transaction description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Transaction fee',
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    fee?: number;
}
