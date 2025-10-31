import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id } = JSON.parse(event.body || '{}');
    if (!id) {
      return { statusCode: 400, body: 'Bad Request: Customer ID is required.' };
    }

    const pool = getDbPool();
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete customer.' }),
    };
  }
};

export { handler };
