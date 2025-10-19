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
import { TransferOrchestrationService } from '../../transfer/services/transfer-orchestration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserVerificationGuard } from '../../user/guards/user-verification.guard';
import {
    CreateWalletDto,
    UpdateWalletDto,
    TransferDto,
} from '../dto/wallet.dto';
import { TokenType } from '../../common/enums/token-type.enum';

@ApiTags('Wallet')
@ApiBearerAuth('BearerAuth')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
    constructor(
        private walletService: WalletService,
        private walletBalanceService: WalletBalanceService,
        private cachedWalletService: CachedWalletService,
        private cachedWalletBalanceService: CachedWalletBalanceService,
        private transferOrchestrationService: TransferOrchestrationService,
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
            createWalletDto.walletType,
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

        return {
            id: wallet.id,
            address: wallet.address,
            publicKey: wallet.publicKey,
            walletType: wallet.walletType,
            status: wallet.status,
            createdAt: wallet.createdAt,
            balances:
                wallet.balances?.map((balance: any) => ({
                    tokenType: balance.tokenType,
                    balance: balance.balance,
                    lastUpdated: balance.lastUpdated,
                })) || [],
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

        return {
            walletId: wallet.id,
            tokenType: tokenType,
            balance,
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

        return {
            walletId: wallet.id,
            balances: balances.map((balance) => ({
                tokenType: balance.tokenType,
                balance: balance.balance,
                lastUpdated: balance.lastUpdated,
            })),
        };
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
        body: { address: string; publicKey: string; walletType: string },
    ) {
        // Check if user already has a wallet
        const existingWallet = await this.walletService.findByUserId(
            req.user.id,
        );

        if (existingWallet) {
            return {
                message: 'Wallet already connected',
                wallet: {
                    id: existingWallet.id,
                    address: existingWallet.address,
                    walletType: existingWallet.walletType,
                },
            };
        }

        // Create new wallet
        const wallet = await this.walletService.create(
            req.user.id,
            body.address,
            body.publicKey,
            body.walletType as any,
        );

        return {
            message: 'Wallet connected successfully',
            wallet: {
                id: wallet.id,
                address: wallet.address,
                walletType: wallet.walletType,
                status: wallet.status,
            },
        };
    }

    @Post('transfer')
    @HttpCode(HttpStatus.OK)
    @UseGuards(UserVerificationGuard)
    async transfer(@Request() req: any, @Body() transferDto: TransferDto) {
        const wallet = await this.walletService.findByUserId(req.user.id);

        if (!wallet) {
            throw new NotFoundException('Wallet not found');
        }

        // Use TransferOrchestrationService for the actual transfer
        const transferRequest = {
            fromAddress: wallet.address,
            toAddress: transferDto.toAddress,
            amount: transferDto.amount,
            tokenType: transferDto.tokenType,
            userId: req.user.id,
        };

        return await this.transferOrchestrationService.initiateTransfer(
            transferRequest,
        );
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
}
