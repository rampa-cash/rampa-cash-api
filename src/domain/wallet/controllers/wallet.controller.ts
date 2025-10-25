import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Redirect,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import { WalletBalanceService } from '../services/wallet-balance.service';
import { CachedWalletService } from '../services/cached-wallet.service';
import { CachedWalletBalanceService } from '../services/cached-wallet-balance.service';
import { BalanceService } from '../services/balance.service';
import { BalanceAggregationService } from '../services/balance-aggregation.service';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';
import { CreateWalletDto, UpdateWalletDto } from '../dto/wallet.dto';
import { TokenType } from '../../common/enums/token-type.enum';
import { TokenAccountService } from '../../solana/services/token-account.service';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(SessionValidationGuard)
export class WalletController {
    constructor(
        private walletService: WalletService,
        private walletBalanceService: WalletBalanceService,
        private cachedWalletService: CachedWalletService,
        private cachedWalletBalanceService: CachedWalletBalanceService,
        private tokenAccountService: TokenAccountService,
        private balanceService: BalanceService,
        private balanceAggregationService: BalanceAggregationService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createWallet(
        @Request() req: any,
        @Body() createWalletDto: CreateWalletDto,
    ) {
        const wallet = await this.walletService.create(
            req.user.id,
            createWalletDto.address,
            createWalletDto.publicKey,
            createWalletDto.walletAddresses,
        );

        return {
            id: wallet.id,
            address: wallet.address,
            publicKey: wallet.publicKey,
            walletType: wallet.walletType,
            status: wallet.status,
            createdAt: wallet.createdAt,
        };
    }

    @Get()
    async getWallet(@Request() req: any) {
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);

        if (!wallet) {
            return { message: 'No wallet found for user' };
        }

        // Get ATA addresses for each balance and include them in the balance object
        const balancesWithAddresses = await Promise.all(
            (wallet.balances || []).map(async (balance: any) => {
                try {
                    if (balance.tokenType === TokenType.SOL) {
                        // For SOL, return the wallet address itself
                        return {
                            tokenType: balance.tokenType,
                            balance: balance.balance,
                            lastUpdated: balance.lastUpdated,
                            address: wallet.address,
                            isATA: false,
                        };
                    } else {
                        // For SPL tokens, get the ATA address
                        const ataAddress =
                            await this.tokenAccountService.getTokenAccountAddress(
                                wallet.address,
                                balance.tokenType,
                            );
                        return {
                            tokenType: balance.tokenType,
                            balance: balance.balance,
                            lastUpdated: balance.lastUpdated,
                            address: ataAddress.toString(),
                            isATA: true,
                        };
                    }
                } catch (error) {
                    // If there's an error getting the ATA address, return null
                    return {
                        tokenType: balance.tokenType,
                        balance: balance.balance,
                        lastUpdated: balance.lastUpdated,
                        address: null,
                        isATA: false,
                        error: 'Failed to get token account address',
                    };
                }
            }),
        );

        return {
            id: wallet.id,
            address: wallet.address,
            publicKey: wallet.publicKey,
            walletType: wallet.walletType,
            status: wallet.status,
            createdAt: wallet.createdAt,
            balances: balancesWithAddresses,
        };
    }

    @Get('balance')
    async getBalance(
        @Request() req: any,
        @Query('tokenType') tokenType: string,
    ) {
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const balance = await this.cachedWalletBalanceService.getBalance(
            wallet.id,
            tokenType as any,
        );

        // Get the token account address
        let address: string | null;
        let isATA: boolean;
        let error: string | undefined;

        try {
            if (tokenType === TokenType.SOL) {
                // For SOL, return the wallet address itself
                address = wallet.address;
                isATA = false;
            } else {
                // For SPL tokens, get the ATA address
                const ataAddress =
                    await this.tokenAccountService.getTokenAccountAddress(
                        wallet.address,
                        tokenType as TokenType,
                    );
                address = ataAddress.toString();
                isATA = true;
            }
        } catch (err) {
            address = null;
            isATA = false;
            error = 'Failed to get token account address';
        }

        return {
            walletId: wallet.id,
            tokenType: tokenType,
            balance,
            address,
            isATA,
            ...(error && { error }),
        };
    }

    @Get('balances')
    async getAllBalances(@Request() req: any) {
        const wallet = await this.cachedWalletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const balances = await this.cachedWalletBalanceService.getAllBalances(
            wallet.id,
        );

        // Get ATA addresses for each balance and include them in the balance object
        const balancesWithAddresses = await Promise.all(
            balances.map(async (balance) => {
                try {
                    if (balance.tokenType === TokenType.SOL) {
                        // For SOL, return the wallet address itself
                        return {
                            tokenType: balance.tokenType,
                            balance: balance.balance,
                            lastUpdated: balance.lastUpdated,
                            address: wallet.address,
                            isATA: false,
                        };
                    } else {
                        // For SPL tokens, get the ATA address
                        const ataAddress =
                            await this.tokenAccountService.getTokenAccountAddress(
                                wallet.address,
                                balance.tokenType,
                            );
                        return {
                            tokenType: balance.tokenType,
                            balance: balance.balance,
                            lastUpdated: balance.lastUpdated,
                            address: ataAddress.toString(),
                            isATA: true,
                        };
                    }
                } catch (error) {
                    // If there's an error getting the ATA address, return null
                    return {
                        tokenType: balance.tokenType,
                        balance: balance.balance,
                        lastUpdated: balance.lastUpdated,
                        address: null,
                        isATA: false,
                        error: 'Failed to get token account address',
                    };
                }
            }),
        );

        return {
            walletId: wallet.id,
            balances: balancesWithAddresses,
        };
    }

    @Post('transfer')
    @HttpCode(HttpStatus.PERMANENT_REDIRECT)
    @Redirect('/transfer', 301)
    @ApiOperation({
        summary: 'Transfer funds (DEPRECATED)',
        description:
            'This endpoint has been moved to POST /transfer. This redirect is provided for backward compatibility.',
        deprecated: true,
    })
    @ApiResponse({
        status: 301,
        description: 'Permanent redirect to POST /transfer',
    })
    async transferRedirect() {
        // This method exists only for backward compatibility
        // The @Redirect decorator will automatically redirect to /transfer
        return;
    }

    @Put()
    async updateWallet(
        @Request() req: any,
        @Body() updateWalletDto: UpdateWalletDto,
    ) {
        const wallet = await this.walletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const updatedWallet = await this.walletService.update(
            wallet.id,
            updateWalletDto,
        );

        return {
            id: updatedWallet.id,
            address: updatedWallet.address,
            publicKey: updatedWallet.publicKey,
            walletType: updatedWallet.walletType,
            status: updatedWallet.status,
            updatedAt: updatedWallet.updatedAt,
        };
    }

    @Post('connect')
    @HttpCode(HttpStatus.OK)
    async connectWallet(
        @Request() req: any,
        @Body()
        body: { address: string; publicKey: string; walletAddresses?: any },
    ) {
        // Check if user already has a wallet
        const existingWallet = await this.walletService.findByUserId(
            req.user.id,
        );

        if (existingWallet) {
            return {
                message: 'Web3Auth wallet already connected',
                wallet: {
                    id: existingWallet.id,
                    address: existingWallet.address,
                    walletType: existingWallet.walletType,
                },
            };
        }

        // Create new Web3Auth wallet
        const wallet = await this.walletService.create(
            req.user.id,
            body.address,
            body.publicKey,
            body.walletAddresses,
        );

        return {
            message: 'Web3Auth wallet connected successfully',
            wallet: {
                id: wallet.id,
                address: wallet.address,
                walletType: wallet.walletType,
                status: wallet.status,
            },
        };
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    async disconnectWallet(@Request() req: any) {
        const wallet = await this.walletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        await this.walletService.remove(wallet.id);

        return { message: 'Wallet disconnected successfully' };
    }

    @Post('suspend')
    @HttpCode(HttpStatus.OK)
    async suspendWallet(@Request() req: any) {
        const wallet = await this.walletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const suspendedWallet = await this.walletService.suspend(wallet.id);

        return {
            message: 'Wallet suspended successfully',
            wallet: {
                id: suspendedWallet.id,
                status: suspendedWallet.status,
            },
        };
    }

    @Post('activate')
    @HttpCode(HttpStatus.OK)
    async activateWallet(@Request() req: any) {
        const wallet = await this.walletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const activatedWallet = await this.walletService.activate(wallet.id);

        return {
            message: 'Wallet activated successfully',
            wallet: {
                id: activatedWallet.id,
                status: activatedWallet.status,
            },
        };
    }

    @Post('create-token-accounts')
    @ApiOperation({
        summary: 'Create Associated Token Accounts for all tokens',
    })
    @ApiResponse({
        status: 201,
        description: 'Token accounts created successfully',
    })
    async createTokenAccounts(@Request() req: any) {
        const userId = req.user.sub;
        const wallet = await this.walletService.findByUserId(userId);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        const results = [];
        const tokenTypes = [TokenType.USDC, TokenType.EURC];

        for (const tokenType of tokenTypes) {
            try {
                const success =
                    await this.tokenAccountService.ensureTokenAccountExists(
                        wallet.address,
                        tokenType,
                    );

                const ataAddress =
                    await this.tokenAccountService.getTokenAccountAddress(
                        wallet.address,
                        tokenType,
                    );

                results.push({
                    tokenType,
                    success,
                    address: ataAddress.toString(),
                    message: success
                        ? 'Token account created successfully'
                        : 'Token account already exists or creation failed',
                });
            } catch (error) {
                results.push({
                    tokenType,
                    success: false,
                    address: null,
                    error: error.message,
                });
            }
        }

        return {
            walletId: wallet.id,
            walletAddress: wallet.address,
            results,
        };
    }

    // Balance endpoints
    @Get('balance/:walletId')
    @ApiOperation({ summary: 'Get wallet balance for specific token' })
    @ApiResponse({
        status: 200,
        description: 'Wallet balance retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async getWalletBalance(
        @Request() req: any,
        @Query('walletId') walletId: string,
        @Query('tokenType') tokenType: TokenType,
    ) {
        return await this.balanceService.getWalletBalance(walletId, tokenType);
    }

    @Get('balance/:walletId/all')
    @ApiOperation({ summary: 'Get all token balances for a wallet' })
    @ApiResponse({
        status: 200,
        description: 'Wallet balances retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async getWalletBalances(
        @Request() req: any,
        @Query('walletId') walletId: string,
    ) {
        return await this.balanceService.getWalletBalances(walletId);
    }

    @Get('balance/:walletId/summary')
    @ApiOperation({ summary: 'Get wallet balance summary' })
    @ApiResponse({
        status: 200,
        description: 'Wallet balance summary retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async getWalletBalanceSummary(
        @Request() req: any,
        @Query('walletId') walletId: string,
    ) {
        return await this.balanceService.getWalletBalanceSummary(walletId);
    }

    @Get('balance/user/all')
    @ApiOperation({ summary: 'Get all user wallet balances' })
    @ApiResponse({
        status: 200,
        description: 'User wallet balances retrieved successfully',
    })
    async getUserWalletBalances(@Request() req: any) {
        return await this.balanceService.getUserWalletBalances(
            req.sessionUser.userId,
        );
    }

    @Get('balance/user/aggregated')
    @ApiOperation({ summary: 'Get aggregated balance across all user wallets' })
    @ApiResponse({
        status: 200,
        description: 'Aggregated balance retrieved successfully',
    })
    async getAggregatedBalance(@Request() req: any) {
        return await this.balanceAggregationService.getAggregatedBalance(
            req.sessionUser.userId,
        );
    }

    @Get('balance/user/total')
    @ApiOperation({ summary: 'Get total user balance' })
    @ApiResponse({
        status: 200,
        description: 'Total user balance retrieved successfully',
    })
    async getTotalUserBalance(@Request() req: any) {
        return await this.balanceService.getTotalUserBalance(
            req.sessionUser.userId,
        );
    }

    @Post('balance/:walletId/refresh')
    @ApiOperation({ summary: 'Refresh wallet balance from blockchain' })
    @ApiResponse({
        status: 200,
        description: 'Wallet balance refreshed successfully',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async refreshWalletBalance(
        @Request() req: any,
        @Query('walletId') walletId: string,
        @Query('tokenType') tokenType: TokenType,
    ) {
        return await this.balanceService.refreshWalletBalance(
            walletId,
            tokenType,
        );
    }

    @Post('balance/:walletId/refresh/all')
    @ApiOperation({ summary: 'Refresh all token balances for a wallet' })
    @ApiResponse({
        status: 200,
        description: 'Wallet balances refreshed successfully',
    })
    @ApiResponse({ status: 404, description: 'Wallet not found' })
    async refreshWalletBalances(
        @Request() req: any,
        @Query('walletId') walletId: string,
    ) {
        return await this.balanceService.refreshWalletBalances(walletId);
    }

    @Post('balance/user/refresh')
    @ApiOperation({ summary: 'Refresh all balances for user' })
    @ApiResponse({
        status: 200,
        description: 'User balances refreshed successfully',
    })
    async refreshAllUserBalances(@Request() req: any) {
        return await this.balanceAggregationService.refreshAllBalances(
            req.sessionUser.userId,
        );
    }

    @Get('balance/user/distribution')
    @ApiOperation({ summary: 'Get balance distribution across tokens' })
    @ApiResponse({
        status: 200,
        description: 'Balance distribution retrieved successfully',
    })
    async getBalanceDistribution(@Request() req: any) {
        return await this.balanceAggregationService.getBalanceDistribution(
            req.sessionUser.userId,
        );
    }

    @Get('balance/user/trends')
    @ApiOperation({ summary: 'Get balance trends over time' })
    @ApiResponse({
        status: 200,
        description: 'Balance trends retrieved successfully',
    })
    async getBalanceTrends(@Request() req: any, @Query('days') days?: number) {
        return await this.balanceAggregationService.getBalanceTrends(
            req.sessionUser.userId,
            days,
        );
    }

    @Get('balance/user/alerts')
    @ApiOperation({ summary: 'Get balance alerts' })
    @ApiResponse({
        status: 200,
        description: 'Balance alerts retrieved successfully',
    })
    async getBalanceAlerts(@Request() req: any) {
        return await this.balanceAggregationService.getBalanceAlerts(
            req.sessionUser.userId,
        );
    }

    @Get('balance/user/top-wallets')
    @ApiOperation({ summary: 'Get top performing wallets by balance' })
    @ApiResponse({
        status: 200,
        description: 'Top wallets retrieved successfully',
    })
    async getTopWalletsByBalance(
        @Request() req: any,
        @Query('limit') limit?: number,
    ) {
        return await this.balanceAggregationService.getTopWalletsByBalance(
            req.sessionUser.userId,
            limit,
        );
    }
}
