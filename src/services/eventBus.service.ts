import { metricsRegistry } from '../middleware/observability.middleware';

export interface DomainEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

class EventBusService {
  private publishedEvents: DomainEvent[] = [];

  public publish(type: string, payload: Record<string, unknown>): DomainEvent {
    const event: DomainEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      payload
    };
    this.publishedEvents.push(event);
    metricsRegistry.recordEventPublished();
    return event;
  }

  public getEvents(): DomainEvent[] {
    return this.publishedEvents;
  }

  public clear(): void {
    this.publishedEvents = [];
  }
}

export const eventBus = new EventBusService();
