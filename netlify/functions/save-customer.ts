import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';
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

    const pool = getDbPool();
    let query;
    let values;

    if (customer.id) {
      // Update existing customer
      query = `
        UPDATE customers
        SET name = $1, phone = $2
        WHERE id = $3
        RETURNING *;
      `;
      values = [customer.name, customer.phone, customer.id];
    } else {
      // Insert new customer
      query = `
        INSERT INTO customers (name, phone)
        VALUES ($1, $2)
        RETURNING *;
      `;
      values = [customer.name, customer.phone];
    }
    
    const { rows } = await pool.query(query, values);
    
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
