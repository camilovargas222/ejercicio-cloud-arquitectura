import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event: 'SERVER_STARTED',
      service: config.serviceName,
      port: config.port,
      environment: config.nodeEnv
    })
  );
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
