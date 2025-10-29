/**
 * Base interface for all external services
 * Follows Dependency Inversion Principle (DIP)
 */
export interface ExternalService {
    /**
     * Health check for the external service
     */
    healthCheck(): Promise<boolean>;

    /**
     * Get service configuration
     */
    getConfiguration(): Record<string, any>;

    /**
     * Initialize the service
     */
    initialize(): Promise<void>;

    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
