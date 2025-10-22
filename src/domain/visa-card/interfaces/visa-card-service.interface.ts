import { CreateVisaCardDto, UpdateVisaCardDto } from '../dto';
import { VISACard, CardStatus } from '../entities/visa-card.entity';

/**
 * Interface for VISA Card Service operations
 * Defines the contract for VISA card management operations
 */
export interface IVISACardService {
    /**
     * Creates a new VISA card
     * @param createVisaCardDto - VISA card creation data
     * @returns Promise<VISACard> - The created VISA card
     */
    create(createVisaCardDto: CreateVisaCardDto): Promise<VISACard>;

    /**
     * Finds all VISA cards
     * @returns Promise<VISACard[]> - Array of all VISA cards
     */
    findAll(): Promise<VISACard[]>;

    /**
     * Finds a VISA card by ID
     * @param id - The VISA card ID
     * @returns Promise<VISACard> - The VISA card if found
     * @throws NotFoundException if VISA card not found
     */
    findOne(id: string): Promise<VISACard>;

    /**
     * Finds a VISA card by user ID
     * @param userId - The user ID
     * @returns Promise<VISACard | null> - The VISA card or null
     */
    findByUserId(userId: string): Promise<VISACard | null>;

    /**
     * Finds a VISA card by card number
     * @param cardNumber - The card number
     * @returns Promise<VISACard | null> - The VISA card or null
     */
    findByCardNumber(cardNumber: string): Promise<VISACard | null>;

    /**
     * Finds VISA cards by status
     * @param status - The card status
     * @returns Promise<VISACard[]> - Array of VISA cards with the specified status
     */
    findByStatus(status: CardStatus): Promise<VISACard[]>;

    /**
     * Updates a VISA card
     * @param id - The VISA card ID
     * @param updateVisaCardDto - Partial VISA card data to update
     * @returns Promise<VISACard> - The updated VISA card
     */
    update(id: string, updateVisaCardDto: UpdateVisaCardDto): Promise<VISACard>;

    /**
     * Activates a VISA card
     * @param id - The VISA card ID
     * @returns Promise<VISACard> - The activated VISA card
     */
    activate(id: string): Promise<VISACard>;

    /**
     * Suspends a VISA card
     * @param id - The VISA card ID
     * @returns Promise<VISACard> - The suspended VISA card
     */
    suspend(id: string): Promise<VISACard>;

    /**
     * Reactivates a suspended VISA card
     * @param id - The VISA card ID
     * @returns Promise<VISACard> - The reactivated VISA card
     */
    reactivate(id: string): Promise<VISACard>;

    /**
     * Cancels a VISA card
     * @param id - The VISA card ID
     * @returns Promise<VISACard> - The cancelled VISA card
     */
    cancel(id: string): Promise<VISACard>;

    /**
     * Updates the balance of a VISA card
     * @param id - The VISA card ID
     * @param amount - The amount to add/subtract from balance
     * @returns Promise<VISACard> - The updated VISA card
     */
    updateBalance(id: string, amount: number): Promise<VISACard>;

    /**
     * Checks if a VISA card can spend a certain amount
     * @param id - The VISA card ID
     * @param amount - The amount to check
     * @returns Promise<SpendingLimits> - Spending limit information
     */
    checkSpendingLimits(
        id: string,
        amount: number,
    ): Promise<{
        canSpend: boolean;
        dailyRemaining: number;
        monthlyRemaining: number;
    }>;

    /**
     * Gets all expired VISA cards
     * @returns Promise<VISACard[]> - Array of expired VISA cards
     */
    getExpiredCards(): Promise<VISACard[]>;

    /**
     * Gets VISA card statistics
     * @param userId - Optional user ID to filter by
     * @returns Promise<CardStats> - VISA card statistics
     */
    getCardStats(userId?: string): Promise<{
        totalCards: number;
        activeCards: number;
        suspendedCards: number;
        cancelledCards: number;
        expiredCards: number;
    }>;
}
