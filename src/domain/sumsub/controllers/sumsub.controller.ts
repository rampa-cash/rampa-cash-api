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
        summary: 'Crear o recuperar applicant SumSub para el usuario actual',
    })
    @ApiResponse({
        status: 201,
        description: 'Applicant creado/recuperado y token generado',
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
        summary: 'Obtener estado de verificación SumSub para el usuario actual',
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
            'Generar token del SDK de SumSub para continuar verificación en el cliente',
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
            'Forzar sincronización con SumSub (útil para reintentos desde Transak/on-ramp)',
    })
    async resync(@Request() req: any) {
        return this.sumsubService.getStatus(req.user.id);
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Webhook público para eventos de SumSub',
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
