import { PartialType } from '@nestjs/mapped-types';
import { CreateOffRampDto } from './create-offramp.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RampStatus } from '../entities/onoff-ramp.entity';

export class UpdateOffRampDto extends PartialType(CreateOffRampDto) {
    @ApiPropertyOptional({ description: 'Off-ramp status', enum: RampStatus })
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
