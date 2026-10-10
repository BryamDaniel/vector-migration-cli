import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  SOURCE_API_URL: z.string().url().default('https://dummyjson.com/products'),
  BATCH_SIZE: z.coerce.number().default(20),
});

export const env = envSchema.parse(process.env);