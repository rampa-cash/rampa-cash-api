import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User, UserStatus } from '../entities/user.entity';

/**
 * Interface for User Service operations
 * Defines the contract for user management operations
 */
export interface IUserService {
    /**
     * Creates a new user
     * @param createUserDto - User creation data
     * @returns Promise<User> - The created user
     */
    create(createUserDto: CreateUserDto): Promise<User>;

    /**
     * Finds all active users
     * @returns Promise<User[]> - Array of all active users
     */
    findAll(): Promise<User[]>;

    /**
     * Finds a user by ID
     * @param id - The user ID
     * @returns Promise<User> - The user if found
     * @throws NotFoundException if user not found
     */
    findOne(id: string): Promise<User>;

    /**
     * Finds a user by email
     * @param email - The user email
     * @returns Promise<User | null> - The user or null
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Finds a user by phone number
     * @param phone - The user phone number
     * @returns Promise<User | null> - The user or null
     */
    findByPhone(phone: string): Promise<User | null>;

    /**
     * Finds a user by auth provider and provider ID
     * @param authProvider - The auth provider name
     * @param authProviderId - The provider-specific user ID
     * @returns Promise<User | null> - The user or null
     */
    findByAuthProvider(
        authProvider: string,
        authProviderId: string,
    ): Promise<User | null>;

    /**
     * Updates a user
     * @param id - The user ID
     * @param updateUserDto - Partial user data to update
     * @returns Promise<User> - The updated user
     */
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;

    /**
     * Removes a user (soft delete)
     * @param id - The user ID
     * @returns Promise<void>
     */
    remove(id: string): Promise<void>;

    /**
     * Suspends a user
     * @param id - The user ID
     * @returns Promise<User> - The suspended user
     */
    suspend(id: string): Promise<User>;

    /**
     * Activates a user
     * @param id - The user ID
     * @returns Promise<User> - The activated user
     */
    activate(id: string): Promise<User>;

    /**
     * Updates the last login timestamp for a user
     * @param id - The user ID
     * @returns Promise<void>
     */
    updateLastLogin(id: string): Promise<void>;

    /**
     * Gets users by status
     * @param status - The user status to filter by
     * @returns Promise<User[]> - Array of users with the specified status
     */
    getUsersByStatus(status: UserStatus): Promise<User[]>;
}
