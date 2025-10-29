import {
    IsUUID,
    IsNumber,
    IsEnum,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TokenType } from '../../common/enums/token-type.enum';

export class CreateTransactionDto {
    @ApiPropertyOptional({ 
        description: 'Recipient user ID (for internal transfers)',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsOptional()
    @IsUUID()
    @ValidateIf((o) => !o.externalAddress)
    recipientId?: string;

    @ApiPropertyOptional({ 
        description: 'External recipient wallet address (for external transfers)',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
    })
    @IsOptional()
    @IsString()
    @ValidateIf((o) => !o.recipientId)
    externalAddress?: string;

    @ApiProperty({ 
        description: 'Transaction amount', 
        minimum: 0.00000001,
        example: 100.5
    })
    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @ApiProperty({ 
        description: 'Token type', 
        enum: TokenType,
        example: TokenType.USDC
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiPropertyOptional({ 
        description: 'Transaction description',
        example: 'Payment for services'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ 
        description: 'Memo for blockchain transaction (external transfers only)',
        example: 'Payment memo'
    })
    @IsOptional()
    @IsString()
    memo?: string;

    @ApiPropertyOptional({ 
        description: 'Sender wallet address override (optional - uses authenticated user\'s wallet if not provided)',
        example: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm'
    })
    @IsOptional()
    @IsString()
    fromAddress?: string;
}
