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
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import { CreateWalletDto, UpdateWalletDto } from '../dto/wallet.dto';
import { TokenType } from '../../common/enums/token-type.enum';
import { TokenAccountService } from '../../solana/services/token-account.service';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
    constructor(
        private walletService: WalletService,
        private walletBalanceService: WalletBalanceService,
        private cachedWalletService: CachedWalletService,
        private cachedWalletBalanceService: CachedWalletBalanceService,
        private tokenAccountService: TokenAccountService,
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
}
