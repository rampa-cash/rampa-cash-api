import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider, Language } from '../entities/user.entity';

export class AuthResponseDto {
    @ApiProperty({ description: 'User object' })
    user: any;

    @ApiProperty({ description: 'JWT access token' })
    accessToken: string;

    @ApiProperty({ description: 'Refresh token (optional)' })
    refreshToken?: string;

    @ApiProperty({ description: 'Token expiration time in seconds' })
    expiresIn: number;

    @ApiProperty({ description: 'User ID' })
    userId: string;

    @ApiProperty({ description: 'User email' })
    email: string;

    @ApiProperty({ description: 'User first name' })
    firstName: string;

    @ApiProperty({ description: 'User last name' })
    lastName: string;

    @ApiProperty({ description: 'User language preference', enum: Language })
    language: Language;

    @ApiProperty({ description: 'Authentication provider', enum: AuthProvider })
    authProvider: AuthProvider;

    @ApiProperty({ description: 'Whether user is active' })
    isActive: boolean;
}
