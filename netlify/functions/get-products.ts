import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

export const handler: Handler = async (event, context) => {
  try {
    const pool = getDbPool();
    // Note: The double quotes around field names are necessary if your
    // table columns were created with camelCase names in PostgreSQL.
    const { rows } = await pool.query('SELECT * FROM products ORDER BY "purchaseDate" DESC');

    // The 'pg' library can return numeric types as strings. We parse them back to numbers
    // to ensure data consistency with the frontend types.
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
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch products.' }),
    };
  }
};
