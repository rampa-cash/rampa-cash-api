import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
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
    async getSdkToken(
        @Request() req: any,
        @Body() dto: CreateSdkTokenDto,
    ) {
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
    })
    async handleWebhook(
        @Body() body: any,
        @Headers('x-payload-digest') signature: string,
    ) {
        const rawBody = JSON.stringify(body);
        await this.sumsubService.handleWebhook(rawBody, signature, body);
        return { received: true };
    }
}
