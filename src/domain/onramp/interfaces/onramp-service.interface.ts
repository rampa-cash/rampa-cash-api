import { CreateOnRampDto, CreateOffRampDto } from '../dto';
import { OnOffRamp, RampType, RampStatus } from '../entities/onoff-ramp.entity';

/**
 * Interface for OnRamp Service operations
 * Defines the contract for on/off-ramp management operations
 */
export interface IOnRampService {
    /**
     * Creates a new on-ramp transaction
     * @param createOnRampDto - On-ramp creation data
     * @returns Promise<OnOffRamp> - The created on-ramp transaction
     */
    createOnRamp(createOnRampDto: CreateOnRampDto): Promise<OnOffRamp>;

    /**
     * Creates a new off-ramp transaction
     * @param createOffRampDto - Off-ramp creation data
     * @returns Promise<OnOffRamp> - The created off-ramp transaction
     */
    createOffRamp(createOffRampDto: CreateOffRampDto): Promise<OnOffRamp>;

    /**
     * Finds all on/off-ramp transactions with optional filtering
     * @param userId - Optional user ID to filter by
     * @param type - Optional ramp type to filter by
     * @returns Promise<OnOffRamp[]> - Array of ramp transactions
     */
    findAll(userId?: string, type?: RampType): Promise<OnOffRamp[]>;

    /**
     * Finds a ramp transaction by ID
     * @param id - The ramp transaction ID
     * @returns Promise<OnOffRamp> - The ramp transaction if found
     * @throws NotFoundException if ramp transaction not found
     */
    findOne(id: string): Promise<OnOffRamp>;

    /**
     * Finds a ramp transaction by provider and provider transaction ID
     * @param provider - The provider name
     * @param providerTransactionId - The provider transaction ID
     * @returns Promise<OnOffRamp | null> - The ramp transaction or null
     */
    findByProvider(
        provider: string,
        providerTransactionId: string,
    ): Promise<OnOffRamp | null>;

    /**
     * Finds ramp transactions by status
     * @param status - The ramp status
     * @returns Promise<OnOffRamp[]> - Array of ramp transactions with the specified status
     */
    findByStatus(status: RampStatus): Promise<OnOffRamp[]>;

    /**
     * Updates the status of a ramp transaction
     * @param id - The ramp transaction ID
     * @param status - The new status
     * @param providerTransactionId - Optional provider transaction ID
     * @returns Promise<OnOffRamp> - The updated ramp transaction
     */
    updateStatus(
        id: string,
        status: RampStatus,
        providerTransactionId?: string,
    ): Promise<OnOffRamp>;

    /**
     * Processes an on-ramp transaction (adds tokens to wallet)
     * @param id - The ramp transaction ID
     * @param providerTransactionId - The provider transaction ID
     * @returns Promise<OnOffRamp> - The processed on-ramp transaction
     */
    processOnRamp(
        id: string,
        providerTransactionId: string,
    ): Promise<OnOffRamp>;

    /**
     * Processes an off-ramp transaction (deducts tokens from wallet)
     * @param id - The ramp transaction ID
     * @param providerTransactionId - The provider transaction ID
     * @returns Promise<OnOffRamp> - The processed off-ramp transaction
     */
    processOffRamp(
        id: string,
        providerTransactionId: string,
    ): Promise<OnOffRamp>;

    /**
     * Marks a ramp transaction as failed
     * @param id - The ramp transaction ID
     * @param failureReason - Reason for failure
     * @returns Promise<OnOffRamp> - The failed ramp transaction
     */
    failRamp(id: string, failureReason: string): Promise<OnOffRamp>;

    /**
     * Gets ramp statistics for a user
     * @param userId - The user ID
     * @param startDate - Optional start date for filtering
     * @param endDate - Optional end date for filtering
     * @returns Promise<RampStats> - Ramp statistics
     */
    getRampStats(
        userId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalOnRamp: number;
        totalOffRamp: number;
        totalFees: number;
        completedOnRamp: number;
        completedOffRamp: number;
        failedOnRamp: number;
        failedOffRamp: number;
    }>;
}
