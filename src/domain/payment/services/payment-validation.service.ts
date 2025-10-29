import { Injectable, BadRequestException } from '@nestjs/common';
import {
    PaymentMethodRequest,
    PaymentIntentRequest,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class PaymentValidationService {
    /**
     * Validate payment method request
     */
    validatePaymentMethodRequest(request: PaymentMethodRequest): void {
        if (!request.type) {
            throw new BadRequestException('Payment method type is required');
        }

        const validTypes = ['card', 'bank', 'wallet', 'crypto'];
        if (!validTypes.includes(request.type)) {
            throw new BadRequestException(
                `Invalid payment method type: ${request.type}`,
            );
        }

        switch (request.type) {
            case 'card':
                this.validateCardDetails(request.cardDetails);
                break;
            case 'bank':
                this.validateBankAccount(request.bankAccount);
                break;
            case 'wallet':
                this.validateWalletAddress(request.walletAddress);
                break;
            case 'crypto':
                this.validateCryptoDetails(request);
                break;
        }
    }

    /**
     * Validate payment intent request
     */
    validatePaymentIntentRequest(request: PaymentIntentRequest): void {
        if (!request.amount || request.amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        if (!request.currency || request.currency.length !== 3) {
            throw new BadRequestException(
                'Valid 3-letter currency code is required',
            );
        }

        const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
        if (!supportedCurrencies.includes(request.currency.toUpperCase())) {
            throw new BadRequestException(
                `Unsupported currency: ${request.currency}`,
            );
        }

        if (request.amount > 1000000) {
            // $10,000 limit
            throw new BadRequestException('Amount exceeds maximum limit');
        }

        if (request.amount < 50) {
            // $0.50 minimum
            throw new BadRequestException('Amount below minimum limit');
        }
    }

    /**
     * Validate card details
     */
    private validateCardDetails(cardDetails?: any): void {
        if (!cardDetails) {
            throw new BadRequestException(
                'Card details are required for card payment method',
            );
        }

        const { number, expiryMonth, expiryYear, cvc, name } = cardDetails;

        if (!number || !this.isValidCardNumber(number)) {
            throw new BadRequestException('Invalid card number');
        }

        if (!expiryMonth || expiryMonth < 1 || expiryMonth > 12) {
            throw new BadRequestException('Invalid expiry month');
        }

        if (!expiryYear || expiryYear < new Date().getFullYear()) {
            throw new BadRequestException('Invalid expiry year');
        }

        if (!cvc || !this.isValidCVC(cvc)) {
            throw new BadRequestException('Invalid CVC');
        }

        if (!name || name.trim().length < 2) {
            throw new BadRequestException('Cardholder name is required');
        }
    }

    /**
     * Validate bank account details
     */
    private validateBankAccount(bankAccount?: any): void {
        if (!bankAccount) {
            throw new BadRequestException(
                'Bank account details are required for bank payment method',
            );
        }

        const { accountNumber, routingNumber, accountType, bankName } =
            bankAccount;

        if (!accountNumber || accountNumber.length < 4) {
            throw new BadRequestException('Invalid account number');
        }

        if (!routingNumber || !this.isValidRoutingNumber(routingNumber)) {
            throw new BadRequestException('Invalid routing number');
        }

        if (!accountType || !['checking', 'savings'].includes(accountType)) {
            throw new BadRequestException('Invalid account type');
        }

        if (!bankName || bankName.trim().length < 2) {
            throw new BadRequestException('Bank name is required');
        }
    }

    /**
     * Validate wallet address
     */
    private validateWalletAddress(walletAddress?: string): void {
        if (!walletAddress || walletAddress.trim().length < 10) {
            throw new BadRequestException('Valid wallet address is required');
        }
    }

    /**
     * Validate crypto details
     */
    private validateCryptoDetails(request: PaymentMethodRequest): void {
        if (!request.walletAddress) {
            throw new BadRequestException(
                'Wallet address is required for crypto payment method',
            );
        }
        this.validateWalletAddress(request.walletAddress);
    }

    /**
     * Validate card number using Luhn algorithm
     */
    private isValidCardNumber(number: string): boolean {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned[i]);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    /**
     * Validate CVC
     */
    private isValidCVC(cvc: string): boolean {
        const cleaned = cvc.replace(/\D/g, '');
        return cleaned.length >= 3 && cleaned.length <= 4;
    }

    /**
     * Validate routing number (basic US bank routing number validation)
     */
    private isValidRoutingNumber(routingNumber: string): boolean {
        const cleaned = routingNumber.replace(/\D/g, '');
        if (cleaned.length !== 9) {
            return false;
        }

        // Basic checksum validation for US routing numbers
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            const digit = parseInt(cleaned[i]);
            sum += digit * (3 - (i % 3) * 2);
        }

        return sum % 10 === 0;
    }

    /**
     * Validate currency code
     */
    validateCurrency(currency: string): boolean {
        const supportedCurrencies = [
            'USD',
            'EUR',
            'GBP',
            'CAD',
            'AUD',
            'CHF',
            'SEK',
            'NOK',
        ];
        return supportedCurrencies.includes(currency.toUpperCase());
    }

    /**
     * Validate amount
     */
    validateAmount(amount: number, currency: string): void {
        if (amount <= 0) {
            throw new BadRequestException('Amount must be greater than 0');
        }

        // Currency-specific limits
        const limits = {
            USD: { min: 50, max: 1000000 }, // $0.50 to $10,000
            EUR: { min: 50, max: 1000000 }, // €0.50 to €10,000
            GBP: { min: 50, max: 1000000 }, // £0.50 to £10,000
            CAD: { min: 50, max: 1000000 }, // C$0.50 to C$10,000
            AUD: { min: 50, max: 1000000 }, // A$0.50 to A$10,000
        };

        const limit = limits[currency.toUpperCase() as keyof typeof limits];
        if (!limit) {
            throw new BadRequestException(`Unsupported currency: ${currency}`);
        }

        if (amount < limit.min) {
            throw new BadRequestException(
                `Amount below minimum limit for ${currency}`,
            );
        }

        if (amount > limit.max) {
            throw new BadRequestException(
                `Amount exceeds maximum limit for ${currency}`,
            );
        }
    }

    /**
     * Sanitize payment data
     */
    sanitizePaymentData(data: any): any {
        const sanitized = { ...data };

        // Remove sensitive fields
        if (sanitized.cardDetails) {
            delete sanitized.cardDetails.cvc;
            if (sanitized.cardDetails.number) {
                sanitized.cardDetails.number = this.maskCardNumber(
                    sanitized.cardDetails.number,
                );
            }
        }

        if (sanitized.bankAccount) {
            if (sanitized.bankAccount.accountNumber) {
                sanitized.bankAccount.accountNumber = this.maskAccountNumber(
                    sanitized.bankAccount.accountNumber,
                );
            }
        }

        return sanitized;
    }

    /**
     * Mask card number
     */
    private maskCardNumber(number: string): string {
        const cleaned = number.replace(/\D/g, '');
        if (cleaned.length < 4) {
            return '****';
        }
        return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
    }

    /**
     * Mask account number
     */
    private maskAccountNumber(accountNumber: string): string {
        const cleaned = accountNumber.replace(/\D/g, '');
        if (cleaned.length < 4) {
            return '****';
        }
        return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
    }
}
