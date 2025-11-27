import { CreateContactDto, UpdateContactDto } from '../dto';
import { Contact } from '../entities/contact.entity';

/**
 * Interface for Contact Service operations
 * Defines the contract for contact management operations
 */
export interface IContactService {
    /**
     * Creates a new contact
     * @param createContactDto - Contact creation data
     * @returns Promise<Contact> - The created contact
     */
    create(createContactDto: CreateContactDto): Promise<Contact>;

    /**
     * Finds all contacts for an owner
     * @param ownerId - The owner user ID
     * @returns Promise<Contact[]> - Array of contacts
     */
    findAll(ownerId: string): Promise<Contact[]>;

    /**
     * Finds a contact by ID
     * @param id - The contact ID
     * @returns Promise<Contact> - The contact if found
     * @throws NotFoundException if contact not found
     */
    findOne(id: string): Promise<Contact>;

    /**
     * Finds a contact by email for an owner
     * @param ownerId - The owner user ID
     * @param email - The contact email
     * @returns Promise<Contact | null> - The contact or null
     */
    findByEmail(ownerId: string, email: string): Promise<Contact | null>;

    /**
     * Finds a contact by phone for an owner
     * @param ownerId - The owner user ID
     * @param phone - The contact phone
     * @returns Promise<Contact | null> - The contact or null
     */
    findByPhone(ownerId: string, phone: string): Promise<Contact | null>;

    /**
     * Finds a contact by wallet address for an owner
     * @param ownerId - The owner user ID
     * @param walletAddress - The wallet address
     * @returns Promise<Contact | null> - The contact or null
     */
    findByWalletAddress(
        ownerId: string,
        walletAddress: string,
    ): Promise<Contact | null>;

    /**
     * Updates a contact
     * @param id - The contact ID
     * @param updateContactDto - Partial contact data to update
     * @returns Promise<Contact> - The updated contact
     */
    update(id: string, updateContactDto: UpdateContactDto): Promise<Contact>;

    /**
     * Removes a contact
     * @param id - The contact ID
     * @returns Promise<void>
     */
    remove(id: string): Promise<void>;

    /**
     * Searches contacts by display name, email, or phone
     * @param ownerId - The owner user ID
     * @param searchTerm - The search term
     * @returns Promise<Contact[]> - Array of matching contacts
     */
    searchContacts(ownerId: string, searchTerm: string): Promise<Contact[]>;

    /**
     * Gets contacts that are app users
     * @param ownerId - The owner user ID
     * @returns Promise<Contact[]> - Array of app user contacts
     */
    getAppUserContacts(ownerId: string): Promise<Contact[]>;

    /**
     * Gets contacts that are not app users
     * @param ownerId - The owner user ID
     * @returns Promise<Contact[]> - Array of non-app user contacts
     */
    getNonAppUserContacts(ownerId: string): Promise<Contact[]>;

    /**
     * Syncs contacts with app users based on email/phone
     * @param ownerId - The owner user ID
     * @returns Promise<Contact[]> - Array of synced contacts
     */
    syncWithAppUsers(ownerId: string): Promise<Contact[]>;

    /**
     * Gets contact statistics for an owner
     * @param ownerId - The owner user ID
     * @returns Promise<ContactStats> - Contact statistics
     */
    getContactStats(ownerId: string): Promise<{
        totalContacts: number;
        appUserContacts: number;
        nonAppUserContacts: number;
    }>;

    /**
     * Validates which phone numbers belong to existing users
     * @param phoneNumbers - Array of phone numbers to validate
     * @returns Promise<string[]> - Existing phone numbers with accounts
     */
    validatePhoneNumbers(phoneNumbers: string[]): Promise<string[]>;

    /**
     * Retrieves user data for the provided phone numbers
     * @param phoneNumbers - Array of phone numbers to lookup
     * @returns Promise<UserPhoneMatch[]> - User data for matching phone numbers
     */
    getUsersByPhoneNumbers(
        phoneNumbers: string[],
    ): Promise<
        Array<{
            id: string;
            name: string | null;
            phone: string | null;
            email: string | null;
            blockchainAddress: string | null;
            isVerified: boolean;
            createdAt: Date;
            updatedAt: Date;
        }>
    >;
}
