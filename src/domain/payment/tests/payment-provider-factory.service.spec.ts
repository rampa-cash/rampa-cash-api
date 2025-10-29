import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
    PaymentProviderFactoryService,
    PaymentProviderType,
} from '../services/payment-provider-factory.service';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';

describe('PaymentProviderFactoryService', () => {
    let service: PaymentProviderFactoryService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentProviderFactoryService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PaymentProviderFactoryService>(
            PaymentProviderFactoryService,
        );
        configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(async () => {
        await module.close();
    });

    describe('getProvider', () => {
        it('should return Stripe provider', () => {
            const provider = service.getProvider(PaymentProviderType.STRIPE);
            expect(provider).toBeDefined();
            expect(provider).toHaveProperty('createPaymentMethod');
            expect(provider).toHaveProperty('createPaymentIntent');
            expect(provider).toHaveProperty('confirmPaymentIntent');
        });

        it('should return PayPal provider', () => {
            const provider = service.getProvider(PaymentProviderType.PAYPAL);
            expect(provider).toBeDefined();
            expect(provider).toHaveProperty('createPaymentMethod');
            expect(provider).toHaveProperty('createPaymentIntent');
            expect(provider).toHaveProperty('confirmPaymentIntent');
        });

        it('should return Square provider', () => {
            const provider = service.getProvider(PaymentProviderType.SQUARE);
            expect(provider).toBeDefined();
            expect(provider).toHaveProperty('createPaymentMethod');
            expect(provider).toHaveProperty('createPaymentIntent');
            expect(provider).toHaveProperty('confirmPaymentIntent');
        });

        it('should return Adyen provider', () => {
            const provider = service.getProvider(PaymentProviderType.ADYEN);
            expect(provider).toBeDefined();
            expect(provider).toHaveProperty('createPaymentMethod');
            expect(provider).toHaveProperty('createPaymentIntent');
            expect(provider).toHaveProperty('confirmPaymentIntent');
        });

        it('should throw error for unsupported provider', () => {
            expect(() => {
                service.getProvider('unsupported' as PaymentProviderType);
            }).toThrow('Payment provider unsupported not supported');
        });
    });

    describe('getSupportedProviders', () => {
        it('should return all supported providers', () => {
            const providers = service.getSupportedProviders();
            expect(providers).toContain(PaymentProviderType.STRIPE);
            expect(providers).toContain(PaymentProviderType.PAYPAL);
            expect(providers).toContain(PaymentProviderType.SQUARE);
            expect(providers).toContain(PaymentProviderType.ADYEN);
            expect(providers).toHaveLength(4);
        });
    });

    describe('getProviderConfig', () => {
        it('should return provider configuration', () => {
            const mockConfig = {
                stripe: {
                    apiKey: 'sk_test_123',
                    secretKey: 'sk_test_secret',
                    environment: 'sandbox',
                    baseUrl: 'https://api.stripe.com',
                },
            };

            jest.spyOn(configService, 'get').mockReturnValue(mockConfig);

            const config = service.getProviderConfig(
                PaymentProviderType.STRIPE,
            );
            expect(config).toEqual(mockConfig.stripe);
        });
    });

    describe('Provider Integration Tests', () => {
        let stripeProvider: IPaymentProvider;
        let paypalProvider: IPaymentProvider;

        beforeEach(() => {
            stripeProvider = service.getProvider(PaymentProviderType.STRIPE);
            paypalProvider = service.getProvider(PaymentProviderType.PAYPAL);
        });

        describe('Stripe Provider', () => {
            it('should create payment method', async () => {
                const request = {
                    type: 'card',
                    cardDetails: {
                        number: '4242424242424242',
                        expiryMonth: 12,
                        expiryYear: 2025,
                        cvc: '123',
                        name: 'John Doe',
                    },
                };

                const result =
                    await stripeProvider.createPaymentMethod(request);
                expect(result).toMatchObject({
                    type: 'card',
                    last4: '4242',
                    brand: 'visa',
                    isVerified: true,
                });
                expect(result.id).toMatch(/^pm_/);
            });

            it('should create payment intent', async () => {
                const request = {
                    amount: 10000,
                    currency: 'usd',
                    description: 'Test payment',
                };

                const result =
                    await stripeProvider.createPaymentIntent(request);
                expect(result).toMatchObject({
                    amount: 10000,
                    currency: 'usd',
                    status: 'pending',
                });
                expect(result.id).toMatch(/^pi_/);
                expect(result.clientSecret).toBeDefined();
            });

            it('should confirm payment intent', async () => {
                const result = await stripeProvider.confirmPaymentIntent(
                    'pi_123',
                    'pm_123',
                );
                expect(result).toMatchObject({
                    status: 'succeeded',
                    paymentMethodId: 'pm_123',
                });
            });

            it('should get supported currencies', async () => {
                const currencies =
                    await stripeProvider.getSupportedCurrencies();
                expect(currencies).toContain('usd');
                expect(currencies).toContain('eur');
                expect(currencies).toContain('gbp');
            });

            it('should get supported payment methods', async () => {
                const methods =
                    await stripeProvider.getSupportedPaymentMethods();
                expect(methods).toContain('card');
                expect(methods).toContain('bank');
                expect(methods).toContain('wallet');
            });
        });

        describe('PayPal Provider', () => {
            it('should create payment method', async () => {
                const request = {
                    type: 'paypal',
                };

                const result =
                    await paypalProvider.createPaymentMethod(request);
                expect(result).toMatchObject({
                    type: 'paypal',
                    isVerified: true,
                });
                expect(result.id).toMatch(/^pp_/);
            });

            it('should create payment intent', async () => {
                const request = {
                    amount: 5000,
                    currency: 'eur',
                    description: 'PayPal test payment',
                };

                const result =
                    await paypalProvider.createPaymentIntent(request);
                expect(result).toMatchObject({
                    amount: 5000,
                    currency: 'eur',
                    status: 'pending',
                });
                expect(result.id).toMatch(/^pp_pi_/);
            });

            it('should get supported currencies', async () => {
                const currencies =
                    await paypalProvider.getSupportedCurrencies();
                expect(currencies).toContain('usd');
                expect(currencies).toContain('eur');
                expect(currencies).toContain('gbp');
                expect(currencies).toContain('aud');
            });

            it('should get supported payment methods', async () => {
                const methods =
                    await paypalProvider.getSupportedPaymentMethods();
                expect(methods).toContain('paypal');
                expect(methods).toContain('card');
            });
        });

        describe('Square Provider', () => {
            it('should create payment method', async () => {
                const squareProvider = service.getProvider(
                    PaymentProviderType.SQUARE,
                );
                const request = {
                    type: 'card',
                    cardDetails: {
                        number: '5555555555554444',
                        expiryMonth: 6,
                        expiryYear: 2026,
                        cvc: '123',
                        name: 'Jane Doe',
                    },
                };

                const result =
                    await squareProvider.createPaymentMethod(request);
                expect(result).toMatchObject({
                    type: 'card',
                    last4: '1234',
                    brand: 'mastercard',
                    isVerified: true,
                });
                expect(result.id).toMatch(/^sq_/);
            });
        });

        describe('Adyen Provider', () => {
            it('should create payment method', async () => {
                const adyenProvider = service.getProvider(
                    PaymentProviderType.ADYEN,
                );
                const request = {
                    type: 'card',
                    cardDetails: {
                        number: '378282246310005',
                        expiryMonth: 3,
                        expiryYear: 2027,
                        cvc: '1234',
                        name: 'Bob Smith',
                    },
                };

                const result = await adyenProvider.createPaymentMethod(request);
                expect(result).toMatchObject({
                    type: 'card',
                    last4: '5678',
                    brand: 'amex',
                    isVerified: true,
                });
                expect(result.id).toMatch(/^adyen_/);
            });

            it('should get supported payment methods', async () => {
                const adyenProvider = service.getProvider(
                    PaymentProviderType.ADYEN,
                );
                const methods =
                    await adyenProvider.getSupportedPaymentMethods();
                expect(methods).toContain('card');
                expect(methods).toContain('klarna');
                expect(methods).toContain('afterpay');
            });
        });

        describe('Webhook Validation', () => {
            it('should validate webhook signatures', () => {
                const stripeProvider = service.getProvider(
                    PaymentProviderType.STRIPE,
                );
                const isValid = stripeProvider.validateWebhookSignature(
                    'test payload',
                    'test signature',
                );
                expect(isValid).toBe(true);
            });

            it('should process webhook events', async () => {
                const stripeProvider = service.getProvider(
                    PaymentProviderType.STRIPE,
                );
                const consoleSpy = jest
                    .spyOn(console, 'log')
                    .mockImplementation();

                await stripeProvider.processWebhookEvent({
                    type: 'payment_intent.succeeded',
                });

                expect(consoleSpy).toHaveBeenCalledWith(
                    'Processing webhook event:',
                    'payment_intent.succeeded',
                );
                consoleSpy.mockRestore();
            });
        });

        describe('Refund Operations', () => {
            it('should create refund', async () => {
                const stripeProvider = service.getProvider(
                    PaymentProviderType.STRIPE,
                );
                const request = {
                    paymentIntentId: 'pi_123',
                    amount: 1000,
                    reason: 'requested_by_customer',
                };

                const result = await stripeProvider.createRefund(request);
                expect(result).toMatchObject({
                    paymentIntentId: 'pi_123',
                    amount: 1000,
                    status: 'succeeded',
                    reason: 'requested_by_customer',
                });
                expect(result.id).toMatch(/^re_/);
            });

            it('should get refund status', async () => {
                const stripeProvider = service.getProvider(
                    PaymentProviderType.STRIPE,
                );
                const result = await stripeProvider.getRefund('re_123');
                expect(result).toMatchObject({
                    id: 're_123',
                    status: 'succeeded',
                });
            });
        });
    });
});
