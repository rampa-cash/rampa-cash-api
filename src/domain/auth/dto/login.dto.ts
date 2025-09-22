import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from '../entities/user.entity';

export class LoginDto {
    @ApiProperty({ description: 'User email address' })
    @IsString()
    email: string;

    @ApiProperty({ description: 'Authentication provider ID' })
    @IsString()
    authProviderId: string;

    @ApiProperty({ description: 'Authentication provider', enum: AuthProvider })
    @IsEnum(AuthProvider)
    authProvider: AuthProvider;
}
