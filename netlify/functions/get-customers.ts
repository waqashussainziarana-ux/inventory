import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

export const handler: Handler = async (event, context) => {
  try {
    const pool = getDbPool();
    const { rows } = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch customers.' }),
    };
  }
};
