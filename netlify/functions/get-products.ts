import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

export const handler: Handler = async (event, context) => {
  try {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM products ORDER BY "purchaseDate" DESC');

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
    console.error('Database Error:', error);

    // Specific error code for "undefined_table" in PostgreSQL
    if (error.code === '42P01') {
      return {
        statusCode: 404, // Use 404 to indicate the resource (table) is not found
        body: JSON.stringify({ error: 'Database not initialized. Products table missing.', code: 'DB_TABLE_NOT_FOUND' }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch products.' }),
    };
  }
};
