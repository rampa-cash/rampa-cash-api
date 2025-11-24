import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../user/entities/user.entity';
import { SumsubApplicantEntity } from '../../sumsub/entities/sumsub-applicant.entity';
import { SumsubService } from '../../sumsub/services/sumsub.service';
import {
    getRampProvidersConfig,
    selectProvider,
    RampProviderConfig,
} from '../../../config/ramp-providers.config';

export interface CountryDetectionResult {
    country: string;
    detectionMethod:
        | 'kyc_residence'
        | 'kyc_document'
        | 'ip_geolocation'
        | 'profile_fallback'
        | 'manual_override';
}

@Injectable()
export class ProviderRouterService {
    private readonly logger = new Logger(ProviderRouterService.name);
    private readonly providers: RampProviderConfig[];

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(SumsubApplicantEntity)
        private readonly sumsubRepository: Repository<SumsubApplicantEntity>,
        private readonly sumsubService: SumsubService,
    ) {
        this.providers = getRampProvidersConfig(configService);
    }

    /**
     * Simplified smart country detection for provider routing
     * Prioritizes residence over nationality
     *
     * Priority Chain (same for both on-ramp and off-ramp):
     * 1. KYC Residence Address (where they actually live - NOT nationality)
     * 2. IP Geolocation (fallback)
     * 3. Profile Country (last resort - could be nationality)
     *
     * Note: Bank account country is NOT used for routing because bank account details
     * are provided directly to Transak/BKCup during the transaction, not stored in Rampa's backend.
     *
     * @param rampType - Used for logging only, not for different detection logic
     */
    async detectUserCountryForRamp(
        userId: string,
        rampType: 'BUY' | 'SELL', // Used for logging only - detection logic is the same
        requestIp?: string,
        manualCountryOverride?: string,
    ): Promise<CountryDetectionResult> {
        // Manual override takes precedence
        if (manualCountryOverride) {
            this.logger.log(
                `User ${userId} manually selected country: ${manualCountryOverride} (${rampType})`,
            );
            return {
                country: manualCountryOverride.toUpperCase(),
                detectionMethod: 'manual_override',
            };
        }

        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        // 1. Use KYC residence address (NOT nationality)
        const applicant = await this.sumsubRepository.findOne({
            where: { userId },
        });

        if (applicant?.applicantId) {
            try {
                // Get full applicant data from Sumsub API (includes address)
                const kycData = await this.sumsubService.getApplicantData(
                    applicant.applicantId,
                );

                // Residence address is more accurate than nationality
                if (kycData?.address?.country) {
                    this.logger.log('Provider routing: using KYC residence', {
                        userId,
                        country: kycData.address.country,
                        method: 'kyc_residence',
                        rampType,
                    });
                    return {
                        country: kycData.address.country.toUpperCase(),
                        detectionMethod: 'kyc_residence',
                    };
                }

                // Fallback to document-verified address
                if (kycData?.fixedInfo?.country) {
                    this.logger.log(
                        'Provider routing: using KYC document country',
                        {
                            userId,
                            country: kycData.fixedInfo.country,
                            method: 'kyc_document',
                            rampType,
                        },
                    );
                    return {
                        country: kycData.fixedInfo.country.toUpperCase(),
                        detectionMethod: 'kyc_document',
                    };
                }
            } catch (error) {
                this.logger.warn(
                    `Failed to get KYC data for user ${userId}: ${error.message}`,
                );
            }
        }

        // 2. IP geolocation (less reliable but better than nothing)
        if (requestIp) {
            try {
                const ipCountry = await this.geolocateIP(requestIp);
                if (ipCountry) {
                    this.logger.warn('Provider routing: using IP geolocation', {
                        userId,
                        country: ipCountry,
                        ip: requestIp,
                        method: 'ip_geolocation',
                        rampType,
                    });
                    return {
                        country: ipCountry.toUpperCase(),
                        detectionMethod: 'ip_geolocation',
                    };
                }
            } catch (error) {
                this.logger.error('IP geolocation failed', { userId, error });
            }
        }

        // 3. Absolute fallback - use profile country (could be nationality)
        // Note: User entity doesn't currently have country field
        // You may need to add it or extract from Sumsub metadata
        const fallbackCountry = 'UNKNOWN';
        this.logger.error('Provider routing: using profile fallback', {
            userId,
            country: fallbackCountry,
            method: 'profile_fallback',
            rampType,
        });

        return {
            country: fallbackCountry,
            detectionMethod: 'profile_fallback',
        };
    }

    /**
     * IP Geolocation helper (using ipapi.co free tier)
     */
    private async geolocateIP(ip: string): Promise<string | null> {
        try {
            // Option 1: ipapi.co (free tier available) - using native fetch
            const response = await fetch(`https://ipapi.co/${ip}/json/`, {
                signal: AbortSignal.timeout(2000),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.country_code; // 'DE', 'BR', etc.
        } catch (error) {
            this.logger.error('IP geolocation failed', { ip, error });
            return null;
        }

        // Option 2: CloudFlare headers (if using CloudFlare)
        // req.headers['cf-ipcountry']

        // Option 3: maxmind GeoIP2 (more accurate, paid)
        // const lookup = geoip.lookup(ip);
        // return lookup.country;
    }

    /**
     * Select provider for user based on smart country detection
     */
    async selectProviderForUser(
        userId: string,
        rampType: 'BUY' | 'SELL',
        requestIp?: string,
        manualCountryOverride?: string,
    ): Promise<{
        provider: RampProviderConfig;
        detection: CountryDetectionResult;
    } | null> {
        const detection = await this.detectUserCountryForRamp(
            userId,
            rampType,
            requestIp,
            manualCountryOverride,
        );

        if (!detection.country || detection.country === 'UNKNOWN') {
            this.logger.warn(
                `Could not determine country for user ${userId} (${rampType})`,
            );
            return null;
        }

        const provider = selectProvider(detection.country, this.providers);

        if (!provider) {
            this.logger.warn(
                `No provider available for country: ${detection.country} (${rampType})`,
            );
            return null;
        }

        this.logger.log(
            `Selected provider ${provider.name} for user ${userId}`,
            {
                country: detection.country,
                method: detection.detectionMethod,
                rampType,
            },
        );

        return { provider, detection };
    }

    /**
     * Get provider by name
     */
    getProviderByName(name: string): RampProviderConfig | null {
        return this.providers.find((p) => p.name === name) || null;
    }

    /**
     * Get all available providers
     */
    getAllProviders(): RampProviderConfig[] {
        return this.providers;
    }
}

