import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

    @ApiPropertyOptional({
        description: 'Web3Auth wallet addresses',
        example: {
            ed25519_app_key: 'app_key_123',
            ed25519_threshold_key: 'threshold_key_123',
            secp256k1_app_key: 'secp256k1_app_key_123',
            secp256k1_threshold_key: 'secp256k1_threshold_key_123',
        },
    })
    @IsOptional()
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };
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
