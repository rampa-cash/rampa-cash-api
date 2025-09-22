import { PartialType } from '@nestjs/mapped-types';
import { CreateOnRampDto } from './create-onramp.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RampStatus } from '../entities/onoff-ramp.entity';

export class UpdateOnRampDto extends PartialType(CreateOnRampDto) {
    @ApiPropertyOptional({ description: 'On-ramp status', enum: RampStatus })
    @IsOptional()
    @IsEnum(RampStatus)
    status?: RampStatus;

    @ApiPropertyOptional({ description: 'Provider transaction ID' })
    @IsOptional()
    @IsString()
    providerTransactionId?: string;

    @ApiPropertyOptional({
        description: 'Failure reason if transaction failed',
    })
    @IsOptional()
    @IsString()
    failureReason?: string;
}
