import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    SolanaFundingService,
    FundingResult,
} from '../services/solana-funding.service';
import { CachedWalletService } from '../../wallet/services/cached-wallet.service';
import { TokenType } from '../../common/enums/token-type.enum';

@ApiTags('Solana Funding')
@Controller('solana/funding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SolanaFundingController {
    constructor(
        private readonly fundingService: SolanaFundingService,
        private readonly cachedWalletService: CachedWalletService,
    ) {}

    @Get('fund-sol')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Fund logged-in user wallet with SOL (devnet/testnet only)',
        description:
            "Airdrop SOL to the logged-in user's wallet for testing purposes. Only works on devnet/testnet.",
    })
    @ApiQuery({
        name: 'amount',
        required: false,
        description: 'Amount of SOL to airdrop (default: 1)',
        example: 1,
        type: 'number',
    })
    @ApiResponse({
        status: 200,
        description: 'Wallet funded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                transactionSignature: { type: 'string' },
                amount: { type: 'number' },
                tokenType: { type: 'string', example: 'SOL' },
                walletAddress: { type: 'string' },
                message: { type: 'string' },
                error: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request parameters',
    })
    @ApiResponse({
        status: 404,
        description: 'User wallet not found',
    })
    async fundWithSol(
        @Request() req: any,
        @Query('amount') amount?: string,
    ): Promise<FundingResult> {
        // Get user's wallet
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);
        if (!wallet) {
            throw new NotFoundException(
                'User wallet not found. Please create a wallet first.',
            );
        }

        const amountNum = amount ? parseFloat(amount) : 1;
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new BadRequestException('Amount must be a positive number');
        }

        return await this.fundingService.fundWithSol(wallet.address, amountNum);
    }

    @Get('fund-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Fund logged-in user wallet with SPL tokens (USDC/EURC)',
        description:
            "Mint SPL tokens to the logged-in user's wallet for testing purposes. Requires mint authority.",
    })
    @ApiQuery({
        name: 'tokenType',
        required: true,
        description: 'Token type to mint',
        enum: ['USDC', 'EURC'],
        example: 'USDC',
    })
    @ApiQuery({
        name: 'amount',
        required: false,
        description: 'Amount of tokens to mint (default: 100)',
        example: 100,
        type: 'number',
    })
    @ApiResponse({
        status: 200,
        description: 'Wallet funded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                transactionSignature: { type: 'string' },
                amount: { type: 'number' },
                tokenType: { type: 'string', example: 'USDC' },
                walletAddress: { type: 'string' },
                message: { type: 'string' },
                error: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request parameters',
    })
    @ApiResponse({
        status: 404,
        description: 'User wallet not found',
    })
    async fundWithToken(
        @Request() req: any,
        @Query('tokenType') tokenType: string,
        @Query('amount') amount?: string,
    ): Promise<FundingResult> {
        // Get user's wallet
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);
        if (!wallet) {
            throw new NotFoundException(
                'User wallet not found. Please create a wallet first.',
            );
        }

        if (!tokenType || !['USDC', 'EURC'].includes(tokenType)) {
            throw new BadRequestException('Token type must be USDC or EURC');
        }

        const amountNum = amount ? parseFloat(amount) : 100;
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new BadRequestException('Amount must be a positive number');
        }

        return await this.fundingService.fundWithSplToken(
            wallet.address,
            tokenType as TokenType.USDC | TokenType.EURC,
            amountNum,
        );
    }

    @Get('fund-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Fund logged-in user wallet with all supported tokens',
        description:
            "Fund the logged-in user's wallet with SOL, USDC, and EURC for comprehensive testing.",
    })
    @ApiQuery({
        name: 'solAmount',
        required: false,
        description: 'Amount of SOL to airdrop (default: 2)',
        example: 2,
        type: 'number',
    })
    @ApiQuery({
        name: 'usdcAmount',
        required: false,
        description: 'Amount of USDC to mint (default: 1000)',
        example: 1000,
        type: 'number',
    })
    @ApiQuery({
        name: 'eurcAmount',
        required: false,
        description: 'Amount of EURC to mint (default: 1000)',
        example: 1000,
        type: 'number',
    })
    @ApiResponse({
        status: 200,
        description: 'Wallet funded successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            transactionSignature: { type: 'string' },
                            amount: { type: 'number' },
                            tokenType: { type: 'string' },
                            walletAddress: { type: 'string' },
                            message: { type: 'string' },
                            error: { type: 'string' },
                        },
                    },
                },
                walletAddress: { type: 'string' },
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request parameters',
    })
    @ApiResponse({
        status: 404,
        description: 'User wallet not found',
    })
    async fundAll(
        @Request() req: any,
        @Query('solAmount') solAmount?: string,
        @Query('usdcAmount') usdcAmount?: string,
        @Query('eurcAmount') eurcAmount?: string,
    ): Promise<{
        success: boolean;
        results: FundingResult[];
        walletAddress: string;
        message: string;
    }> {
        // Get user's wallet
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);
        if (!wallet) {
            throw new NotFoundException(
                'User wallet not found. Please create a wallet first.',
            );
        }

        const solAmountNum = solAmount ? parseFloat(solAmount) : 2;
        const usdcAmountNum = usdcAmount ? parseFloat(usdcAmount) : 1000;
        const eurcAmountNum = eurcAmount ? parseFloat(eurcAmount) : 1000;

        if (isNaN(solAmountNum) || solAmountNum < 0) {
            throw new BadRequestException(
                'SOL amount must be a non-negative number',
            );
        }
        if (isNaN(usdcAmountNum) || usdcAmountNum < 0) {
            throw new BadRequestException(
                'USDC amount must be a non-negative number',
            );
        }
        if (isNaN(eurcAmountNum) || eurcAmountNum < 0) {
            throw new BadRequestException(
                'EURC amount must be a non-negative number',
            );
        }

        const tokens = [
            { tokenType: TokenType.SOL, amount: solAmountNum },
            { tokenType: TokenType.USDC, amount: usdcAmountNum },
            { tokenType: TokenType.EURC, amount: eurcAmountNum },
        ];

        const results = await this.fundingService.fundWithMultipleTokens(
            wallet.address,
            tokens,
        );

        const successCount = results.filter((r) => r.success).length;
        const totalCount = results.length;

        return {
            success: successCount > 0,
            results,
            walletAddress: wallet.address,
            message: `Funded wallet with ${successCount}/${totalCount} tokens successfully`,
        };
    }

    @Get('admin-key')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get admin public key',
        description:
            'Get the admin public key used for funding operations (for reference).',
    })
    @ApiResponse({
        status: 200,
        description: 'Admin public key retrieved',
        schema: {
            type: 'object',
            properties: {
                adminPublicKey: { type: 'string' },
                message: { type: 'string' },
            },
        },
    })
    async getAdminKey(): Promise<{ adminPublicKey: string; message: string }> {
        return {
            adminPublicKey: this.fundingService.getAdminPublicKey(),
            message: 'Admin public key for funding operations',
        };
    }
}
