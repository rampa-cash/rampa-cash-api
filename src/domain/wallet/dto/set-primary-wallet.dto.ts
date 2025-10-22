import { IsBoolean } from 'class-validator';

export class SetPrimaryWalletDto {
    @IsBoolean()
    isPrimary: boolean;
}
