import { IsOptional } from 'class-validator';
import { IsSolanaAddress } from '../../common/decorators/validation.decorator';

export class CreateWalletDto {
    @IsSolanaAddress()
    address: string;

    @IsSolanaAddress()
    publicKey: string;

    @IsOptional()
    walletAddresses?: {
        ed25519_app_key?: string;
        ed25519_threshold_key?: string;
        secp256k1_app_key?: string;
        secp256k1_threshold_key?: string;
    };
}
