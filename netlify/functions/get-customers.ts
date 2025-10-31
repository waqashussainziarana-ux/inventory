import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon();
    const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    };
  } catch (error: any) {
    console.error('Full Database Error in get-customers:', error);
    if (error.code === '42P01') { // undefined_table
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Database not initialized. Customers table missing.', code: 'DB_TABLE_NOT_FOUND' }),
        };
    }
    const errorMessage = `Database query failed for customers. Code: ${error.code || 'N/A'}`;
    return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};