import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon();
    const rows = await sql`SELECT * FROM suppliers ORDER BY name ASC`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    };
  } catch (error: any) {
    if (error.code === '42P01') { // undefined_table
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Database not initialized. Suppliers table missing.', code: 'DB_TABLE_NOT_FOUND' }),
        };
    }
    return {
        statusCode: 500,
        body: JSON.stringify({ error: `Database query failed for suppliers. Code: ${error.code || 'N/A'}`, details: error.message }),
    };
  }
};