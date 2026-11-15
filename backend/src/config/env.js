import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/iomt_rpm?schema=public',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  edgeGatewayPort: parseInt(process.env.EDGE_GATEWAY_PORT || '5005', 10),
  isDev: (process.env.NODE_ENV || 'development') === 'development',
};
