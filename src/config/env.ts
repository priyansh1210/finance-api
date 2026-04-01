import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: process.env.DB_PATH || './database/zorvyn.db',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
