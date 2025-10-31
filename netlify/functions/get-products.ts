import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon();
    const rows = await sql`SELECT * FROM products ORDER BY "purchaseDate" DESC`;

    const products = rows.map(row => ({
      ...row,
      purchasePrice: parseFloat(row.purchasePrice),
      sellingPrice: parseFloat(row.sellingPrice),
      quantity: parseInt(row.quantity, 10),
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products),
    };
  } catch (error: any) {
    console.error('Full Database Error in get-products:', error);

    // Specific error code for "undefined_table" in PostgreSQL
    if (error.code === '42P01') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Database not initialized. Products table missing.', code: 'DB_TABLE_NOT_FOUND' }),
      };
    }

    const errorMessage = `Database query failed. Please check connection and logs. Code: ${error.code || 'N/A'}`;

    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};