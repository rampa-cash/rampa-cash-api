import { IsOptional, IsString } from 'class-validator';

export class CreateSdkTokenDto {
    @IsOptional()
    @IsString()
    levelName?: string;
}
