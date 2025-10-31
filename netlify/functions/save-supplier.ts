import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { Supplier } from '../../types';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const supplier: Partial<Supplier> = JSON.parse(event.body || '{}');

    if (!supplier.name) {
      return { statusCode: 400, body: 'Bad Request: Name is required.' };
    }

    const sql = neon();
    let rows;

    if (supplier.id) {
      rows = await sql`
        UPDATE suppliers
        SET name = ${supplier.name}, email = ${supplier.email || null}, phone = ${supplier.phone || null}
        WHERE id = ${supplier.id}
        RETURNING *;
      `;
    } else {
      rows = await sql`
        INSERT INTO suppliers (name, email, phone)
        VALUES (${supplier.name}, ${supplier.email || null}, ${supplier.phone || null})
        ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone
        RETURNING *;
      `;
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save supplier.' }),
    };
  }
};

export { handler };