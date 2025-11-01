import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { Supplier } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const supplier: Partial<Supplier> = req.body;

    if (!supplier.name) {
      return res.status(400).json({ error: 'Bad Request: Name is required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
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
    
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to save supplier.' });
  }
};
