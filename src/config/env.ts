export interface AppConfig {
  port: number;
  nodeEnv: string;
  serviceName: string;
  serviceVersion: string;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  cbFailureThreshold: number;
  cbResetTimeoutMs: number;
}

export const config: AppConfig = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'catalog-microservice',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_zero_trust_key_2026',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  cbFailureThreshold: Number(process.env.CB_FAILURE_THRESHOLD || 3),
  cbResetTimeoutMs: Number(process.env.CB_RESET_TIMEOUT_MS || 10000)
};
