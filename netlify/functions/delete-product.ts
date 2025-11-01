import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { id } = JSON.parse(event.body || '{}');
    if (!id) {
      return { statusCode: 400, body: 'Bad Request: Product ID is required.' };
    }

    const sql = neon();
    
    const result = await sql`DELETE FROM products WHERE id = ${id}`;
    
    if (result.rowCount === 0) {
         return { statusCode: 404, body: 'Product not found.' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete product.' }),
    };
  }
};

export { handler };