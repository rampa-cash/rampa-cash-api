import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../events/domain-event.base';

type EventHandler<T extends DomainEvent = DomainEvent> = (
    event: T,
) => Promise<void> | void;

/**
 * Event bus service for publishing and subscribing to domain events
 *
 * @description This service provides a simple in-memory event bus for
 * publishing and handling domain events. It supports event subscription,
 * publishing, and error handling for event handlers.
 */
@Injectable()
export class EventBusService {
    private readonly logger = new Logger(EventBusService.name);
    private readonly handlers = new Map<string, EventHandler[]>();
    private readonly eventHistory: DomainEvent[] = [];
    private readonly maxHistorySize = 1000;

    /**
     * Subscribe to events of a specific type
     * @param eventType - Type of event to subscribe to
     * @param handler - Function to handle the event
     */
    public subscribe<T extends DomainEvent>(
        eventType: string,
        handler: EventHandler<T>,
    ): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }

        this.handlers.get(eventType)!.push(handler as EventHandler);
        this.logger.debug(`Subscribed to ${eventType} events`);
    }

    /**
     * Unsubscribe from events of a specific type
     * @param eventType - Type of event to unsubscribe from
     * @param handler - Handler function to remove
     */
    public unsubscribe<T extends DomainEvent>(
        eventType: string,
        handler: EventHandler<T>,
    ): void {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler as EventHandler);
            if (index > -1) {
                handlers.splice(index, 1);
                this.logger.debug(`Unsubscribed from ${eventType} events`);
            }
        }
    }

    /**
     * Publish a domain event to all subscribed handlers
     * @param event - Domain event to publish
     */
    public async publish(event: DomainEvent): Promise<void> {
        this.logger.debug(`Publishing event: ${event.toString()}`);

        // Store event in history
        this.addToHistory(event);

        // Get handlers for this event type
        const handlers = this.handlers.get(event.eventType) || [];

        if (handlers.length === 0) {
            this.logger.debug(
                `No handlers found for event type: ${event.eventType}`,
            );
            return;
        }

        // Execute all handlers
        const handlerPromises = handlers.map((handler) =>
            this.executeHandler(event, handler),
        );

        try {
            await Promise.allSettled(handlerPromises);
            this.logger.debug(
                `Successfully published event: ${event.eventType}`,
            );
        } catch (error) {
            this.logger.error(
                `Error publishing event ${event.eventType}:`,
                error,
            );
        }
    }

    /**
     * Publish multiple events in sequence
     * @param events - Array of domain events to publish
     */
    public async publishAll(events: DomainEvent[]): Promise<void> {
        this.logger.debug(`Publishing ${events.length} events`);

        for (const event of events) {
            await this.publish(event);
        }
    }

    /**
     * Get all event handlers for a specific event type
     * @param eventType - Type of event
     * @returns Array of event handlers
     */
    public getHandlers(eventType: string): EventHandler[] {
        return this.handlers.get(eventType) || [];
    }

    /**
     * Get all registered event types
     * @returns Array of event type names
     */
    public getEventTypes(): string[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Get event history (last N events)
     * @param limit - Maximum number of events to return
     * @returns Array of recent events
     */
    public getEventHistory(limit: number = 100): DomainEvent[] {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Get events of a specific type from history
     * @param eventType - Type of event to filter by
     * @param limit - Maximum number of events to return
     * @returns Array of events of the specified type
     */
    public getEventHistoryByType(
        eventType: string,
        limit: number = 100,
    ): DomainEvent[] {
        return this.eventHistory
            .filter((event) => event.eventType === eventType)
            .slice(-limit);
    }

    /**
     * Clear event history
     */
    public clearHistory(): void {
        this.eventHistory.length = 0;
        this.logger.debug('Event history cleared');
    }

    /**
     * Get statistics about the event bus
     * @returns Event bus statistics
     */
    public getStats(): {
        totalEventTypes: number;
        totalHandlers: number;
        totalEventsPublished: number;
        handlersByType: Record<string, number>;
    } {
        const handlersByType: Record<string, number> = {};
        let totalHandlers = 0;

        for (const [eventType, handlers] of this.handlers.entries()) {
            handlersByType[eventType] = handlers.length;
            totalHandlers += handlers.length;
        }

        return {
            totalEventTypes: this.handlers.size,
            totalHandlers,
            totalEventsPublished: this.eventHistory.length,
            handlersByType,
        };
    }

    /**
     * Execute a single event handler with error handling
     * @param event - Domain event
     * @param handler - Event handler function
     */
    private async executeHandler(
        event: DomainEvent,
        handler: EventHandler,
    ): Promise<void> {
        try {
            await handler(event);
        } catch (error) {
            this.logger.error(
                `Error executing handler for event ${event.eventType}:`,
                error,
            );
            // Don't re-throw to prevent one handler failure from affecting others
        }
    }

    /**
     * Add event to history with size limit
     * @param event - Domain event to add
     */
    private addToHistory(event: DomainEvent): void {
        this.eventHistory.push(event);

        // Maintain size limit
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
}
