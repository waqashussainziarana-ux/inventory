import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { Customer } from '../../types';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const customer: Partial<Customer> = JSON.parse(event.body || '{}');

    if (!customer.name || !customer.phone) {
      return { statusCode: 400, body: 'Bad Request: Name and phone are required.' };
    }

    const sql = neon();
    let rows;

    if (customer.id) {
      // Update existing customer
      rows = await sql`
        UPDATE customers
        SET name = ${customer.name}, phone = ${customer.phone}
        WHERE id = ${customer.id}
        RETURNING *;
      `;
    } else {
      // Insert new customer
      rows = await sql`
        INSERT INTO customers (name, phone)
        VALUES (${customer.name}, ${customer.phone})
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
      body: JSON.stringify({ error: 'Failed to save customer.' }),
    };
  }
};

export { handler };