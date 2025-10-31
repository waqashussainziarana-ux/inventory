import pg from 'pg';

const { Pool } = pg;

// This creates a single, reusable connection pool.
let pool: pg.Pool;

export function getDbPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("The DATABASE_URL environment variable is not set.");
    }
    
    // The pg library automatically handles the 'sslmode=require' part of the connection string.
    pool = new Pool({
      connectionString,
    });
  }
  return pool;
}
