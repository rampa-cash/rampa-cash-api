import { ApiProperty } from '@nestjs/swagger';

export class MissingFieldsDto {
    @ApiProperty({
        description: 'List of missing required fields',
        type: [String],
        example: ['email', 'firstName', 'lastName'],
    })
    missingFields: string[];

    @ApiProperty({
        description: 'Whether profile is complete',
        example: false,
    })
    isComplete: boolean;
}
