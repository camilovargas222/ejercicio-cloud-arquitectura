import request from 'supertest';
import { createApp } from '../src/app';
import {
  externalServiceCircuitBreaker,
  resetRateLimiter
} from '../src/middleware/resilience.middleware';
import { eventBus } from '../src/services/eventBus.service';

const app = createApp();

describe('Unidad 3 - Pruebas Unitarias del Microservicio Cloud-Native', () => {
  beforeEach(() => {
    externalServiceCircuitBreaker.reset();
    resetRateLimiter();
    eventBus.clear();
  });

  it('1. Debe responder 200 OK en /api/v1/health e incluir cabecera de traza distribuida X-Trace-Id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.headers['x-trace-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('2. Debe exponer metricas en formato Prometheus en /api/v1/metrics', async () => {
    await request(app).get('/api/v1/items');
    const res = await request(app).get('/api/v1/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('resilience_circuit_breaker_state');
  });

  it('3. Debe listar los productos iniciales del catalogo en GET /api/v1/items', async () => {
    const res = await request(app).get('/api/v1/items');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('4. Debe bloquear con 401 la creacion de items sin Token JWT (Zero Trust Security)', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .send({ name: 'Firewall Cloud', price: 250 });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('5. Debe emitir un JWT valido y permitir crear un item publicando un evento en el Bus de Eventos', async () => {
    const authRes = await request(app)
      .post('/api/v1/auth/token')
      .send({ username: 'camilo.vargas', role: 'admin' });

    expect(authRes.status).toBe(200);
    const token = authRes.body.access_token;
    expect(token).toBeDefined();

    const createRes = await request(app)
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cluster Kubernetes Multi-Zona',
        category: 'Cloud-Native',
        price: 499.99,
        stock: 5
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.item.name).toBe('Cluster Kubernetes Multi-Zona');
    expect(createRes.body.eventPublished.type).toBe('ITEM_CREATED');

    const eventsRes = await request(app).get('/api/v1/events');
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.totalEvents).toBe(1);
  });

  it('6. Debe abrir el Circuit Breaker tras alcanzar el umbral de fallos consecutivos', async () => {
    await request(app).post('/api/v1/resilience/simulate-external').send({ shouldFail: true });
    await request(app).post('/api/v1/resilience/simulate-external').send({ shouldFail: true });
    const thirdFail = await request(app)
      .post('/api/v1/resilience/simulate-external')
      .send({ shouldFail: true });

    expect(thirdFail.status).toBe(502);
    expect(thirdFail.body.circuitBreaker.state).toBe('OPEN');

    const fastFail = await request(app)
      .post('/api/v1/resilience/simulate-external')
      .send({ shouldFail: false });

    expect(fastFail.status).toBe(503);
    expect(fastFail.body.status).toBe('FALLBACK_ACTIVATED');
  });
});
