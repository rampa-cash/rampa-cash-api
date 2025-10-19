import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '../entities/wallet.entity';
import { TokenType } from '../../common/enums/token-type.enum';

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
