import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InvestmentService } from '../services/investment.service';
import { InvestmentOption, InvestmentType, InvestmentRisk } from '../entities/investment-option.entity';
import { UserInvestment, InvestmentStatus } from '../entities/user-investment.entity';
import { InvestmentTransaction } from '../entities/investment-transaction.entity';
import { InvestmentOptionFilter, InvestmentStats, InvestmentPerformance } from '../interfaces/investment-service.interface';
import { SessionValidationGuard } from '../../auth/guards/session-validation.guard';

export class CreateInvestmentDto {
    investmentOptionId: string;
    amount: number;
}

export class WithdrawInvestmentDto {
    amount: number;
}

export class SearchInvestmentDto {
    query: string;
}

@ApiTags('Investments')
@Controller('investments')
@UseGuards(SessionValidationGuard)
export class InvestmentController {
    constructor(private readonly investmentService: InvestmentService) {}

    @Get('options')
    @ApiOperation({ summary: 'Get all investment options' })
    @ApiResponse({ status: 200, description: 'Investment options retrieved successfully' })
    @ApiQuery({ name: 'type', required: false, enum: InvestmentType })
    @ApiQuery({ name: 'riskLevel', required: false, enum: InvestmentRisk })
    @ApiQuery({ name: 'minAmount', required: false, type: Number })
    @ApiQuery({ name: 'maxAmount', required: false, type: Number })
    @ApiQuery({ name: 'provider', required: false, type: String })
    async getAllInvestmentOptions(
        @Query('type') type?: InvestmentType,
        @Query('riskLevel') riskLevel?: InvestmentRisk,
        @Query('minAmount') minAmount?: number,
        @Query('maxAmount') maxAmount?: number,
        @Query('provider') provider?: string,
    ): Promise<InvestmentOption[]> {
        const filter: InvestmentOptionFilter = {
            type,
            riskLevel,
            minAmount,
            maxAmount,
            provider,
            isActive: true,
        };

        return this.investmentService.getAllInvestmentOptions(filter);
    }

    @Get('options/:id')
    @ApiOperation({ summary: 'Get investment option by ID' })
    @ApiResponse({ status: 200, description: 'Investment option retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Investment option not found' })
    async getInvestmentOptionById(@Param('id') id: string): Promise<InvestmentOption | null> {
        const option = await this.investmentService.getInvestmentOptionById(id);
        if (!option) {
            throw new NotFoundException('Investment option not found');
        }
        return option;
    }

    @Get('options/type/:type')
    @ApiOperation({ summary: 'Get investment options by type' })
    @ApiResponse({ status: 200, description: 'Investment options retrieved successfully' })
    async getInvestmentOptionsByType(@Param('type') type: InvestmentType): Promise<InvestmentOption[]> {
        return this.investmentService.getInvestmentOptionsByType(type);
    }

    @Get('options/risk/:riskLevel')
    @ApiOperation({ summary: 'Get investment options by risk level' })
    @ApiResponse({ status: 200, description: 'Investment options retrieved successfully' })
    async getInvestmentOptionsByRisk(@Param('riskLevel') riskLevel: InvestmentRisk): Promise<InvestmentOption[]> {
        return this.investmentService.getInvestmentOptionsByRisk(riskLevel);
    }

    @Get('options/search')
    @ApiOperation({ summary: 'Search investment options' })
    @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
    async searchInvestmentOptions(@Query() searchDto: SearchInvestmentDto): Promise<InvestmentOption[]> {
        return this.investmentService.searchInvestmentOptions(searchDto.query);
    }

    @Get('my-investments')
    @ApiOperation({ summary: 'Get user investments' })
    @ApiResponse({ status: 200, description: 'User investments retrieved successfully' })
    @ApiQuery({ name: 'status', required: false, enum: InvestmentStatus })
    async getUserInvestments(
        @Request() req: any,
        @Query('status') status?: InvestmentStatus,
    ): Promise<UserInvestment[]> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.investmentService.getUserInvestments(sessionUser.id, status);
    }

    @Get('my-investments/:id')
    @ApiOperation({ summary: 'Get user investment by ID' })
    @ApiResponse({ status: 200, description: 'User investment retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User investment not found' })
    async getUserInvestmentById(
        @Request() req: any,
        @Param('id') id: string,
    ): Promise<UserInvestment | null> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        const investment = await this.investmentService.getUserInvestmentById(sessionUser.id, id);
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }
        return investment;
    }

    @Post('invest')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new investment' })
    @ApiResponse({ status: 201, description: 'Investment created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid investment parameters' })
    async createInvestment(
        @Request() req: any,
        @Body() createInvestmentDto: CreateInvestmentDto,
    ): Promise<InvestmentTransaction> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.investmentService.processInvestment(
            sessionUser.id,
            createInvestmentDto.investmentOptionId,
            createInvestmentDto.amount,
        );
    }

    @Post('my-investments/:id/withdraw')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Withdraw from investment' })
    @ApiResponse({ status: 201, description: 'Withdrawal created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid withdrawal parameters' })
    async withdrawFromInvestment(
        @Request() req: any,
        @Param('id') id: string,
        @Body() withdrawDto: WithdrawInvestmentDto,
    ): Promise<InvestmentTransaction> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.investmentService.processWithdrawal(
            sessionUser.id,
            id,
            withdrawDto.amount,
        );
    }

    @Post('my-investments/:id/pause')
    @ApiOperation({ summary: 'Pause investment' })
    @ApiResponse({ status: 200, description: 'Investment paused successfully' })
    async pauseInvestment(
        @Request() req: any,
        @Param('id') id: string,
    ): Promise<UserInvestment> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Verify ownership
        const investment = await this.investmentService.getUserInvestmentById(sessionUser.id, id);
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        return this.investmentService.pauseInvestment(id);
    }

    @Post('my-investments/:id/resume')
    @ApiOperation({ summary: 'Resume investment' })
    @ApiResponse({ status: 200, description: 'Investment resumed successfully' })
    async resumeInvestment(
        @Request() req: any,
        @Param('id') id: string,
    ): Promise<UserInvestment> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Verify ownership
        const investment = await this.investmentService.getUserInvestmentById(sessionUser.id, id);
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        return this.investmentService.resumeInvestment(id);
    }

    @Post('my-investments/:id/cancel')
    @ApiOperation({ summary: 'Cancel investment' })
    @ApiResponse({ status: 200, description: 'Investment cancelled successfully' })
    async cancelInvestment(
        @Request() req: any,
        @Param('id') id: string,
    ): Promise<UserInvestment> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        // Verify ownership
        const investment = await this.investmentService.getUserInvestmentById(sessionUser.id, id);
        if (!investment) {
            throw new NotFoundException('Investment not found');
        }

        return this.investmentService.cancelInvestment(id);
    }

    @Get('my-investments/stats')
    @ApiOperation({ summary: 'Get user investment statistics' })
    @ApiResponse({ status: 200, description: 'Investment statistics retrieved successfully' })
    async getUserInvestmentStats(@Request() req: any): Promise<InvestmentStats> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.investmentService.getUserInvestmentStats(sessionUser.id);
    }

    @Get('my-investments/performance')
    @ApiOperation({ summary: 'Get user investment performance' })
    @ApiResponse({ status: 200, description: 'Investment performance retrieved successfully' })
    async getUserInvestmentPerformance(@Request() req: any): Promise<InvestmentPerformance[]> {
        const sessionUser = req.sessionUser;
        if (!sessionUser || !sessionUser.id) {
            throw new UnauthorizedException('User not authenticated');
        }

        return this.investmentService.getUserInvestmentPerformance(sessionUser.id);
    }

    @Get('options/:id/performance')
    @ApiOperation({ summary: 'Get investment option performance' })
    @ApiResponse({ status: 200, description: 'Investment option performance retrieved successfully' })
    async getInvestmentOptionPerformance(@Param('id') id: string): Promise<any> {
        return this.investmentService.getInvestmentOptionPerformance(id);
    }

    @Get('top-performing')
    @ApiOperation({ summary: 'Get top performing investments' })
    @ApiResponse({ status: 200, description: 'Top performing investments retrieved successfully' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getTopPerformingInvestments(
        @Query('limit') limit?: number,
    ): Promise<InvestmentPerformance[]> {
        return this.investmentService.getTopPerformingInvestments(limit);
    }
}
