import { IsUUID, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TokenType } from '../../common/enums/token-type.enum';

export class CreateWalletBalanceDto {
    @ApiProperty({ description: 'Wallet ID' })
    @IsUUID()
    walletId: string;

    @ApiProperty({ description: 'Token type', enum: TokenType })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiProperty({ description: 'Token balance', minimum: 0, default: 0 })
    @IsNumber()
    @Min(0)
    balance: number;
}
