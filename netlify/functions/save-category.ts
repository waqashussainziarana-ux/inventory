import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name } = JSON.parse(event.body || '{}');
    if (!name) {
      return { statusCode: 400, body: 'Bad Request: Category name is required.' };
    }

    const sql = neon();
    
    const rows = await sql`
      INSERT INTO categories (name)
      VALUES (${name})
      ON CONFLICT (name) DO NOTHING
      RETURNING *;
    `;
    
    if (rows.length === 0) {
      // If nothing was returned, it means the category already existed.
      // Fetch the existing category to return it to the client.
      const [existingCategory] = await sql`SELECT * FROM categories WHERE name = ${name}`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingCategory),
      };
    }
    
    return {
      statusCode: 201, // 201 Created for a new category
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