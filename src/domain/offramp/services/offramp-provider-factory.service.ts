import { Injectable } from '@nestjs/common';
import { OffRampProvider } from '../entities/offramp-transaction.entity';
import { IOffRampProvider } from '../interfaces/offramp-provider.interface';

@Injectable()
export class OffRampProviderFactoryService {
    private providers: Map<OffRampProvider, IOffRampProvider> = new Map();

    constructor() {
        this.initializeProviders();
    }

    private initializeProviders(): void {
        // Mock implementations for MVP
        this.providers.set(
            OffRampProvider.TRANSAK,
            new MockTransakOffRampProvider(),
        );
        this.providers.set(
            OffRampProvider.MOONPAY,
            new MockMoonpayOffRampProvider(),
        );
        this.providers.set(OffRampProvider.RAMP, new MockRampOffRampProvider());
        this.providers.set(OffRampProvider.WYRE, new MockWyreOffRampProvider());
    }

    getProvider(provider: OffRampProvider): IOffRampProvider {
        const providerService = this.providers.get(provider);
        if (!providerService) {
            throw new Error(`Off-ramp provider ${provider} not supported`);
        }
        return providerService;
    }

    getSupportedProviders(): OffRampProvider[] {
        return Array.from(this.providers.keys());
    }
}

// Mock implementations for MVP
class MockTransakOffRampProvider implements IOffRampProvider {
    async getQuote(request: {
        tokenAmount: number;
        tokenType: string;
        fiatCurrency: string;
    }) {
        return {
            provider: 'transak',
            tokenAmount: request.tokenAmount,
            fiatAmount: request.tokenAmount * 1.0, // Mock 1:1 rate
            fiatCurrency: request.fiatCurrency,
            exchangeRate: 1.0,
            fee: request.tokenAmount * 0.01, // 1% fee
            estimatedTime: '1-3 business days',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        };
    }

    async initiateOffRamp(request: any) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId: `transak-${Date.now()}`,
            status: 'processing' as any,
            quote: await this.getQuote(request),
            redirectUrl: `https://transak.com/offramp/${Date.now()}`,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        };
    }

    async getOffRampStatus(providerTransactionId: string) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId,
            status: 'completed' as any,
            fiatAmount: 100,
            fiatCurrency: 'USD',
            completedAt: new Date(),
        };
    }

    async cancelOffRamp(providerTransactionId: string) {
        return true;
    }

    async getSupportedCurrencies() {
        return ['USD', 'EUR', 'GBP'];
    }

    async getLimits(fiatCurrency: string) {
        return {
            minAmount: 50,
            maxAmount: 10000,
        };
    }
}

class MockMoonpayOffRampProvider implements IOffRampProvider {
    async getQuote(request: {
        tokenAmount: number;
        tokenType: string;
        fiatCurrency: string;
    }) {
        return {
            provider: 'moonpay',
            tokenAmount: request.tokenAmount,
            fiatAmount: request.tokenAmount * 0.99, // Mock rate
            fiatCurrency: request.fiatCurrency,
            exchangeRate: 0.99,
            fee: request.tokenAmount * 0.005, // 0.5% fee
            estimatedTime: '2-5 business days',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        };
    }

    async initiateOffRamp(request: any) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId: `moonpay-${Date.now()}`,
            status: 'processing' as any,
            quote: await this.getQuote(request),
            redirectUrl: `https://moonpay.com/offramp/${Date.now()}`,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        };
    }

    async getOffRampStatus(providerTransactionId: string) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId,
            status: 'completed' as any,
            fiatAmount: 100,
            fiatCurrency: 'USD',
            completedAt: new Date(),
        };
    }

    async cancelOffRamp(providerTransactionId: string) {
        return true;
    }

    async getSupportedCurrencies() {
        return ['USD', 'EUR', 'GBP', 'CAD'];
    }

    async getLimits(fiatCurrency: string) {
        return {
            minAmount: 25,
            maxAmount: 50000,
        };
    }
}

class MockRampOffRampProvider implements IOffRampProvider {
    async getQuote(request: {
        tokenAmount: number;
        tokenType: string;
        fiatCurrency: string;
    }) {
        return {
            provider: 'ramp',
            tokenAmount: request.tokenAmount,
            fiatAmount: request.tokenAmount * 1.01, // Mock rate
            fiatCurrency: request.fiatCurrency,
            exchangeRate: 1.01,
            fee: request.tokenAmount * 0.02, // 2% fee
            estimatedTime: '1-2 business days',
            expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
        };
    }

    async initiateOffRamp(request: any) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId: `ramp-${Date.now()}`,
            status: 'processing' as any,
            quote: await this.getQuote(request),
            redirectUrl: `https://ramp.network/offramp/${Date.now()}`,
            expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        };
    }

    async getOffRampStatus(providerTransactionId: string) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId,
            status: 'completed' as any,
            fiatAmount: 100,
            fiatCurrency: 'USD',
            completedAt: new Date(),
        };
    }

    async cancelOffRamp(providerTransactionId: string) {
        return true;
    }

    async getSupportedCurrencies() {
        return ['USD', 'EUR', 'GBP'];
    }

    async getLimits(fiatCurrency: string) {
        return {
            minAmount: 100,
            maxAmount: 25000,
        };
    }
}

class MockWyreOffRampProvider implements IOffRampProvider {
    async getQuote(request: {
        tokenAmount: number;
        tokenType: string;
        fiatCurrency: string;
    }) {
        return {
            provider: 'wyre',
            tokenAmount: request.tokenAmount,
            fiatAmount: request.tokenAmount * 0.98, // Mock rate
            fiatCurrency: request.fiatCurrency,
            exchangeRate: 0.98,
            fee: request.tokenAmount * 0.015, // 1.5% fee
            estimatedTime: '3-7 business days',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };
    }

    async initiateOffRamp(request: any) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId: `wyre-${Date.now()}`,
            status: 'processing' as any,
            quote: await this.getQuote(request),
            redirectUrl: `https://wyre.com/offramp/${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }

    async getOffRampStatus(providerTransactionId: string) {
        return {
            transactionId: `offramp-${Date.now()}`,
            providerTransactionId,
            status: 'completed' as any,
            fiatAmount: 100,
            fiatCurrency: 'USD',
            completedAt: new Date(),
        };
    }

    async cancelOffRamp(providerTransactionId: string) {
        return true;
    }

    async getSupportedCurrencies() {
        return ['USD', 'EUR'];
    }

    async getLimits(fiatCurrency: string) {
        return {
            minAmount: 75,
            maxAmount: 15000,
        };
    }
}
