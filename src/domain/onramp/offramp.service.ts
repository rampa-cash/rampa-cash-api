import { Injectable } from '@nestjs/common';
import { OnRampService } from './onramp.service';

@Injectable()
export class OffRampService {
    constructor(private onRampService: OnRampService) { }

    // OffRampService delegates to OnRampService since they share the same entity
    // This provides a cleaner API separation while reusing the same logic

    async createOffRamp(createOffRampDto: any) {
        return await this.onRampService.createOffRamp(createOffRampDto);
    }

    async findAll(userId?: string) {
        return await this.onRampService.findAll(userId, 'offramp' as any);
    }

    async findOne(id: string) {
        return await this.onRampService.findOne(id);
    }

    async findByProvider(provider: string, providerTransactionId: string) {
        return await this.onRampService.findByProvider(provider, providerTransactionId);
    }

    async findByStatus(status: any) {
        return await this.onRampService.findByStatus(status);
    }

    async updateStatus(id: string, status: any, providerTransactionId?: string) {
        return await this.onRampService.updateStatus(id, status, providerTransactionId);
    }

    async processOffRamp(id: string, providerTransactionId: string) {
        return await this.onRampService.processOffRamp(id, providerTransactionId);
    }

    async failRamp(id: string, failureReason: string) {
        return await this.onRampService.failRamp(id, failureReason);
    }

    async getOffRampStats(userId: string, startDate?: Date, endDate?: Date) {
        const stats = await this.onRampService.getRampStats(userId, startDate, endDate);

        return {
            totalOffRamp: stats.totalOffRamp,
            totalFees: stats.totalFees,
            completedOffRamp: stats.completedOffRamp,
            failedOffRamp: stats.failedOffRamp
        };
    }
}
