import { Module } from '@nestjs/common';
import { EventBusService } from '../services/event-bus.service';

/**
 * EventBus module for domain event handling
 *
 * @description This module provides the EventBusService for publishing
 * and subscribing to domain events across the application.
 */
@Module({
    providers: [EventBusService],
    exports: [EventBusService],
})
export class EventBusModule {}
