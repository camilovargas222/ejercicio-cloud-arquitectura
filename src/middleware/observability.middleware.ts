import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';

class MetricsRegistry {
  public httpRequestsTotal: number = 0;
  public httpErrorsTotal: number = 0;
  public statusCodes: Record<number, number> = {};
  public totalLatencyMs: number = 0;
  public eventsPublishedTotal: number = 0;

  public recordRequest(statusCode: number, durationMs: number): void {
    this.httpRequestsTotal += 1;
    this.totalLatencyMs += durationMs;
    this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
    if (statusCode >= 400) {
      this.httpErrorsTotal += 1;
    }
  }

  public recordEventPublished(): void {
    this.eventsPublishedTotal += 1;
  }

  public toPrometheusFormat(circuitState: string): string {
    const avgLatency =
      this.httpRequestsTotal > 0
        ? (this.totalLatencyMs / this.httpRequestsTotal).toFixed(2)
        : '0.00';

    const lines: string[] = [
      '# HELP http_requests_total Total de peticiones HTTP procesadas por el microservicio',
      '# TYPE http_requests_total counter',
      `http_requests_total{service="${config.serviceName}"} ${this.httpRequestsTotal}`,
      '# HELP http_errors_total Total de respuestas HTTP con error (>=400)',
      '# TYPE http_errors_total counter',
      `http_errors_total{service="${config.serviceName}"} ${this.httpErrorsTotal}`,
      '# HELP http_request_duration_avg_ms Latencia promedio de peticiones HTTP en milisegundos',
      '# TYPE http_request_duration_avg_ms gauge',
      `http_request_duration_avg_ms{service="${config.serviceName}"} ${avgLatency}`,
      '# HELP event_bus_published_total Total de eventos enviados al Bus de Eventos',
      '# TYPE event_bus_published_total counter',
      `event_bus_published_total{service="${config.serviceName}"} ${this.eventsPublishedTotal}`,
      '# HELP resilience_circuit_breaker_state Estado actual del Circuit Breaker (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      '# TYPE resilience_circuit_breaker_state gauge',
      `resilience_circuit_breaker_state{service="${config.serviceName}",state="${circuitState}"} ${
        circuitState === 'CLOSED' ? 0 : circuitState === 'HALF_OPEN' ? 1 : 2
      }`
    ];

    for (const [code, count] of Object.entries(this.statusCodes)) {
      lines.push(
        `http_requests_by_status_total{service="${config.serviceName}",status="${code}"} ${count}`
      );
    }

    return lines.join('\n') + '\n';
  }
}

export const metricsRegistry = new MetricsRegistry();

export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const incomingTraceId =
    (req.headers['x-trace-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    crypto.randomUUID();

  (req as Request & { traceId?: string }).traceId = incomingTraceId;
  res.setHeader('X-Trace-Id', incomingTraceId);

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    metricsRegistry.recordRequest(res.statusCode, durationMs);

    const structuredLog = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      service: config.serviceName,
      version: config.serviceVersion,
      traceId: incomingTraceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: durationMs,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    if (config.nodeEnv !== 'test') {
      console.log(JSON.stringify(structuredLog));
    }
  });

  next();
}
