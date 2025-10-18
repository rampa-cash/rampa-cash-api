import {
    Controller,
    Post,
    Get,
    Body,
    Request,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserVerificationService } from '../services/user-verification.service';
import { CompleteProfileDto } from '../dto/complete-profile.dto';
import { VerificationStatusDto } from '../dto/verification-status.dto';
import { MissingFieldsDto } from '../dto/missing-fields.dto';

@ApiTags('User Verification')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserVerificationController {
    constructor(private userVerificationService: UserVerificationService) {}

    @Post('complete-profile')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete user profile with missing information' })
    @ApiResponse({
        status: 200,
        description: 'Profile completed successfully',
        schema: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    description: 'Updated user object',
                },
                message: {
                    type: 'string',
                    example: 'Profile completed successfully',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request data or no new information provided',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async completeProfile(
        @Request() req: any,
        @Body() completeProfileDto: CompleteProfileDto,
    ): Promise<{ user: any; message: string }> {
        const user = await this.userVerificationService.completeProfile(
            req.user.id,
            completeProfileDto,
        );
        return {
            user,
            message: 'Profile completed successfully',
        };
    }

    @Get('verification-status')
    @ApiOperation({
        summary: 'Get user verification status and missing fields',
    })
    @ApiResponse({
        status: 200,
        description: 'Verification status retrieved successfully',
        type: VerificationStatusDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getVerificationStatus(
        @Request() req: any,
    ): Promise<VerificationStatusDto> {
        return await this.userVerificationService.getVerificationStatus(
            req.user.id,
        );
    }

    @Get('missing-fields')
    @ApiOperation({ summary: 'Get missing fields for user profile' })
    @ApiResponse({
        status: 200,
        description: 'Missing fields retrieved successfully',
        type: MissingFieldsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async getMissingFields(@Request() req: any): Promise<MissingFieldsDto> {
        return await this.userVerificationService.getMissingFields(req.user.id);
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify user and activate account (admin only)' })
    @ApiResponse({
        status: 200,
        description: 'User verified successfully',
        schema: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    description: 'Updated user object',
                },
                message: {
                    type: 'string',
                    example: 'User verified successfully',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    async verifyUser(
        @Request() req: any,
    ): Promise<{ user: any; message: string }> {
        const user = await this.userVerificationService.verifyUser(req.user.id);
        return {
            user,
            message: 'User verified successfully',
        };
    }
}
