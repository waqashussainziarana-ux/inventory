import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name } = JSON.parse(event.body || '{}');
    if (!name) {
      return { statusCode: 400, body: 'Bad Request: Category name is required.' };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO categories (name)
      VALUES ($1)
      ON CONFLICT (name) DO NOTHING
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [name]);
    
    if (rows.length === 0) {
        // Find the existing category if conflict occurred
        const { rows: existingRows } = await pool.query('SELECT * FROM categories WHERE name = $1', [name]);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existingRows[0]),
        };
    }
    
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save category.' }),
    };
  }
};

export { handler };
