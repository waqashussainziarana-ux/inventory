import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Customer } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const customer: Partial<Customer> = req.body;

    if (!customer.name || !customer.phone) {
      return res.status(400).json({ error: 'Bad Request: Name and phone are required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    let rows;

    if (customer.id) {
      rows = await sql`
        UPDATE customers
        SET name = ${customer.name}, phone = ${customer.phone}
        WHERE id = ${customer.id}
        RETURNING *;
      `;
    } else {
      rows = await sql`
        INSERT INTO customers (name, phone)
        VALUES (${customer.name}, ${customer.phone})
        RETURNING *;
      `;
    }
    
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to save customer.' });
  }
};
