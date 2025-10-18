import { ApiProperty } from '@nestjs/swagger';
import { UserVerificationStatus } from '../entities/user.entity';

export class VerificationStatusDto {
    @ApiProperty({
        description: 'User verification status',
        enum: UserVerificationStatus,
        example: UserVerificationStatus.PENDING_VERIFICATION,
    })
    verificationStatus: UserVerificationStatus;

    @ApiProperty({
        description: 'List of missing required fields',
        type: [String],
        example: ['email', 'firstName', 'lastName'],
    })
    missingFields: string[];

    @ApiProperty({
        description: 'Whether the user is fully verified',
        example: false,
    })
    isVerified: boolean;
}
