import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { metricsRegistry } from '../middleware/observability.middleware';
import { requireAuth, signJwt } from '../middleware/auth.middleware';
import {
  externalServiceCircuitBreaker,
  retryWithBackoff
} from '../middleware/resilience.middleware';
import { eventBus } from '../services/eventBus.service';

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const catalogDatabase: CatalogItem[] = [
  {
    id: 'item-1',
    name: 'Nodo Cloud Kubernetes GKE',
    category: 'Infraestructura',
    price: 120.5,
    stock: 15
  },
  {
    id: 'item-2',
    name: 'Licencia API Gateway Enterprise',
    category: 'Seguridad DevSecOps',
    price: 85.0,
    stock: 40
  }
];

export const catalogRouter = Router();

catalogRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    service: config.serviceName,
    version: config.serviceVersion,
    timestamp: new Date().toISOString(),
    resilience: externalServiceCircuitBreaker.getStats()
  });
});

catalogRouter.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res
    .status(200)
    .send(metricsRegistry.toPrometheusFormat(externalServiceCircuitBreaker.getState()));
});

catalogRouter.post('/auth/token', (req: Request, res: Response) => {
  const { username, role } = req.body || {};
  if (!username) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'El campo username es obligatorio para emitir un JWT.'
    });
    return;
  }

  const token = signJwt(username, role || 'architect', 3600);
  res.status(200).json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600
  });
});

catalogRouter.get('/items', (_req: Request, res: Response) => {
  res.status(200).json({
    count: catalogDatabase.length,
    items: catalogDatabase
  });
});

catalogRouter.post('/items', requireAuth, (req: Request, res: Response) => {
  const { name, category, price, stock } = req.body || {};
  if (!name || price === undefined) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Los campos name y price son obligatorios.'
    });
    return;
  }

  const newItem: CatalogItem = {
    id: `item-${catalogDatabase.length + 1}`,
    name: String(name),
    category: String(category || 'General'),
    price: Number(price),
    stock: Number(stock ?? 1)
  };

  catalogDatabase.push(newItem);

  const event = eventBus.publish('ITEM_CREATED', {
    itemId: newItem.id,
    name: newItem.name,
    price: newItem.price
  });

  res.status(201).json({
    message: 'Recurso creado y publicado en el Bus de Eventos exitosamente',
    item: newItem,
    eventPublished: event
  });
});

catalogRouter.get('/events', (_req: Request, res: Response) => {
  const events = eventBus.getEvents();
  res.status(200).json({
    totalEvents: events.length,
    events
  });
});

catalogRouter.post('/resilience/simulate-external', async (req: Request, res: Response) => {
  const shouldFail = Boolean(req.body?.shouldFail);

  try {
    const responseData = await externalServiceCircuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => {
          if (shouldFail) {
            throw new Error('Fallo de conexion con el servicio externo de pagos');
          }
          return {
            externalService: 'payment-gateway-service',
            verified: true,
            timestamp: new Date().toISOString()
          };
        },
        1,
        10
      );
    });

    res.status(200).json({
      status: 'SUCCESS',
      circuitBreaker: externalServiceCircuitBreaker.getStats(),
      data: responseData
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isCircuitOpen = errorMessage.includes('CircuitBreakerOpenError');

    res.status(isCircuitOpen ? 503 : 502).json({
      status: 'FALLBACK_ACTIVATED',
      error: errorMessage,
      circuitBreaker: externalServiceCircuitBreaker.getStats(),
      fallbackMessage:
        'Respuesta degradada elegante (Graceful Degradation) activada por el patron Circuit Breaker.'
    });
  }
});
