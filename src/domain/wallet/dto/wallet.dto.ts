import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { WalletType } from '../entities/wallet.entity';
import { TokenType } from '../entities/wallet-balance.entity';

export class CreateWalletDto {
    @IsString()
    address: string;

    @IsString()
    publicKey: string;

    @IsEnum(WalletType)
    walletType: WalletType;
}

export class UpdateWalletDto {
    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    publicKey?: string;
}

export class TransferDto {
    @IsString()
    toAddress: string;

    @IsNumber()
    @Min(0.00000001)
    amount: number;

    @IsEnum(TokenType)
    tokenType: TokenType;

    @IsOptional()
    @IsString()
    description?: string;
}
