import express, { Application, Request, Response } from 'express';
import { observabilityMiddleware } from './middleware/observability.middleware';
import { securityHeadersMiddleware } from './middleware/auth.middleware';
import { rateLimiterMiddleware } from './middleware/resilience.middleware';
import { catalogRouter } from './routes/catalog.routes';
import { config } from './config/env';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(securityHeadersMiddleware);
  app.use(observabilityMiddleware);
  app.use(rateLimiterMiddleware);

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      architecture: 'Cloud-Native Microservice Architecture',
      unit: 'Unidad 3 - Cloud-Native, Infraestructura, Observabilidad y Seguridad',
      service: config.serviceName,
      endpoints: {
        health: '/api/v1/health',
        metrics: '/api/v1/metrics',
        authToken: 'POST /api/v1/auth/token',
        catalogItems: 'GET/POST /api/v1/items',
        eventBus: 'GET /api/v1/events',
        resilienceDemo: 'POST /api/v1/resilience/simulate-external'
      }
    });
  });

  app.use('/api/v1', catalogRouter);

  return app;
}
