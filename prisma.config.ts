import dotenv from 'dotenv';
import { defineConfig, env } from '@prisma/config';

const prismaEnv = process.env.PRISMA_ENV ?? 'local';
const envFile = prismaEnv === 'docker' ? '.env.docker' : '.env.local';

dotenv.config({ path: envFile });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
