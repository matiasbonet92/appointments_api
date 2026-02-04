import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    this.pool = new Pool({
      connectionString,
    });
  }

  async ping(): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 as ok');
    return result.rows[0]?.ok === 1;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
