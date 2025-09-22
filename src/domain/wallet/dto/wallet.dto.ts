import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '../entities/wallet.entity';
import { TokenType } from '../entities/wallet-balance.entity';

export class CreateWalletDto {
    @ApiProperty({
        description: 'Wallet address',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: 'Wallet public key',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsString()
    publicKey: string;

    @ApiProperty({
        description: 'Type of wallet',
        enum: WalletType,
        example: WalletType.WEB3AUTH_MPC,
    })
    @IsEnum(WalletType)
    walletType: WalletType;
}

export class UpdateWalletDto {
    @ApiPropertyOptional({
        description: 'Updated wallet address',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({
        description: 'Updated wallet public key',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsOptional()
    @IsString()
    publicKey?: string;
}

export class TransferDto {
    @ApiProperty({
        description: 'Recipient wallet address',
        example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    })
    @IsString()
    toAddress: string;

    @ApiProperty({
        description: 'Amount to transfer',
        example: 1.5,
        minimum: 0.00000001,
    })
    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @ApiProperty({
        description: 'Type of token to transfer',
        enum: TokenType,
        example: TokenType.SOL,
    })
    @IsEnum(TokenType)
    tokenType: TokenType;

    @ApiPropertyOptional({
        description: 'Optional transfer description',
        example: 'Payment for services',
    })
    @IsOptional()
    @IsString()
    description?: string;
}
