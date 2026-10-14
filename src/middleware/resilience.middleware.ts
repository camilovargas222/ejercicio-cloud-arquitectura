import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

interface ClientRateRecord {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, ClientRateRecord>();

export function resetRateLimiter(): void {
  rateLimitStore.clear();
}

export function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const maxRequests = config.rateLimitMaxRequests;
  const windowMs = config.rateLimitWindowMs;

  const current = rateLimitStore.get(clientIp);
  if (!current || now - current.windowStart > windowMs) {
    rateLimitStore.set(clientIp, { count: 1, windowStart: now });
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
    next();
    return;
  }

  current.count += 1;
  const remaining = Math.max(0, maxRequests - current.count);
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (current.count > maxRequests) {
    res.status(429).json({
      error: 'TooManyRequests',
      pattern: 'Rate Limiting',
      message: 'Se supero el limite de peticiones permitidas en la ventana actual.'
    });
    return;
  }

  next();
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(
    private readonly failureThreshold: number = config.cbFailureThreshold,
    private readonly resetTimeoutMs: number = config.cbResetTimeoutMs
  ) {}

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public getStats() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      resetTimeoutMs: this.resetTimeoutMs
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      throw new Error('CircuitBreakerOpenError: Servicio externo temporalmente aislado.');
    }

    try {
      const result = await action();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      } else {
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount += 1;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 20
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export const externalServiceCircuitBreaker = new CircuitBreaker();
