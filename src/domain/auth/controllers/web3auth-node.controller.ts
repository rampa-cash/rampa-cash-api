import {
    Body,
    Controller,
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
import { CustomJwtIssuerService } from '../services/custom-jwt-issuer.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MintIdTokenDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsInt()
    @Min(30)
    ttlSeconds?: number;
}

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth/web3auth')
export class Web3AuthNodeController {
    constructor(private readonly customJwtIssuer: CustomJwtIssuerService) {}

    @Post('id-token')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Mint short-lived Custom JWT idToken for Web3Auth Node SDK',
    })
    @ApiResponse({ status: 200 })
    async mintIdToken(
        @Request() req: any,
        @Body() body: MintIdTokenDto,
    ): Promise<{ idToken: string; expiresIn: number }> {
        const sub = body.userId || req.user?.id;
        const ttl = body.ttlSeconds ?? undefined;
        const idToken = await this.customJwtIssuer.issueIdToken({
            sub,
            expiresInSeconds: ttl,
        });
        return {
            idToken,
            expiresIn:
                ttl ?? Number(process.env.WEB3AUTH_CUSTOM_JWT_TTL || '300'),
        };
    }
}
