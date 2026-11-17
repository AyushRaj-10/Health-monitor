import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/iomt_rpm?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-iomt-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-iomt-2026',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  edgeGatewayPort: parseInt(process.env.EDGE_GATEWAY_PORT || '5005', 10),
  isDev: (process.env.NODE_ENV || 'development') === 'development',
};
