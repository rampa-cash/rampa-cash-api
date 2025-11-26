import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Request,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { SumsubService } from '../services/sumsub.service';
import { CreateApplicantDto } from '../dto/create-applicant.dto';
import { CreateSdkTokenDto } from '../dto/sdk-token.dto';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { SumsubStatusDto } from '../dto/sumsub-status.dto';

@ApiTags('SumSub')
@Controller('sumsub')
export class SumsubController {
    constructor(private readonly sumsubService: SumsubService) {}

    @Post('applicant')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create or retrieve SumSub applicant for the current user',
    })
    @ApiResponse({
        status: 201,
        description: 'Applicant created/retrieved and token generated',
    })
    async createOrGetApplicant(
        @Request() req: any,
        @Body() dto: CreateApplicantDto,
    ) {
        const { applicant, sdkToken } =
            await this.sumsubService.createOrGetApplicant(req.user.id, dto);

        return {
            applicantId: applicant.applicantId,
            levelName: applicant.levelName,
            reviewStatus: applicant.reviewStatus,
            sdkToken,
            source: applicant.source,
        };
    }

    @Get('status')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get SumSub verification status for the current user',
    })
    @ApiResponse({ status: 200, type: SumsubStatusDto })
    async getStatus(@Request() req: any): Promise<SumsubStatusDto> {
        return this.sumsubService.getStatus(req.user.id);
    }

    @Post('sdk-token')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary:
            'Generate SumSub SDK token to continue verification on the client',
    })
    async getSdkToken(@Request() req: any, @Body() dto: CreateSdkTokenDto) {
        const token = await this.sumsubService.getOrCreateSdkTokenByUser(
            req.user.id,
            dto.levelName,
        );

        return token;
    }

    @Post('resync')
    @UseGuards(SessionValidationGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary:
            'Force synchronization with SumSub (useful for retries from Transak/on-ramp)',
    })
    async resync(@Request() req: any) {
        return this.sumsubService.getStatus(req.user.id);
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Public webhook for SumSub events',
        description:
            'Receives webhook events from SumSub. Signature verification uses raw HTTP body.',
    })
    async handleWebhook(
        @Req() req: ExpressRequest & { body: Buffer },
        @Headers('x-payload-digest') signature: string,
    ) {
        // CRITICAL: When using express.raw(), req.body is a Buffer
        // Convert to string for signature verification
        const rawBody = req.body.toString('utf8');

        if (!rawBody) {
            throw new UnauthorizedException(
                'Raw body not available for signature verification',
            );
        }

        // Parse JSON for processing (but use raw body for verification)
        const body = JSON.parse(rawBody);

        // Verify signature and process webhook
        await this.sumsubService.handleWebhook(rawBody, signature, body);
        return { received: true };
    }
}
