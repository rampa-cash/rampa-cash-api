import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for all domain events
 *
 * @description This abstract class provides common properties and methods
 * that all domain events should have, including event ID, timestamp,
 * event type, and metadata.
 *
 * @example
 * ```typescript
 * class UserCreatedEvent extends DomainEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly email: string,
 *     public readonly timestamp: Date = new Date()
 *   ) {
 *     super('UserCreated', timestamp);
 *   }
 * }
 * ```
 */
export abstract class DomainEvent {
    /**
     * Unique identifier for this event instance
     */
    public readonly eventId: string;

    /**
     * Type of the domain event (e.g., 'UserCreated', 'TransactionCompleted')
     */
    public readonly eventType: string;

    /**
     * When the event occurred
     */
    public readonly occurredAt: Date;

    /**
     * Additional metadata for the event
     */
    public readonly metadata: Record<string, any>;

    /**
     * Version of the event schema (for future compatibility)
     */
    public readonly version: number = 1;

    constructor(
        eventType: string,
        occurredAt: Date = new Date(),
        metadata: Record<string, any> = {},
    ) {
        this.eventId = uuidv4();
        this.eventType = eventType;
        this.occurredAt = occurredAt;
        this.metadata = metadata;
    }

    /**
     * Get the event as a plain object for serialization
     */
    public toJSON(): Record<string, any> {
        return {
            eventId: this.eventId,
            eventType: this.eventType,
            occurredAt: this.occurredAt.toISOString(),
            metadata: this.metadata,
            version: this.version,
        };
    }

    /**
     * Get a string representation of the event
     */
    public toString(): string {
        return `${this.eventType}[${this.eventId}] at ${this.occurredAt.toISOString()}`;
    }

    /**
     * Check if this event is of a specific type
     */
    public isEventType(eventType: string): boolean {
        return this.eventType === eventType;
    }

    /**
     * Check if this event occurred after a specific date
     */
    public occurredAfter(date: Date): boolean {
        return this.occurredAt > date;
    }

    /**
     * Check if this event occurred before a specific date
     */
    public occurredBefore(date: Date): boolean {
        return this.occurredAt < date;
    }

    /**
     * Get the age of this event in milliseconds
     */
    public getAge(): number {
        return Date.now() - this.occurredAt.getTime();
    }

    /**
     * Check if this event is recent (within the last N milliseconds)
     */
    public isRecent(withinMs: number): boolean {
        return this.getAge() <= withinMs;
    }
}
