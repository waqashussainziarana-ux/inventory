import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Bad Request: Category name is required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const rows = await sql`
      INSERT INTO categories (name)
      VALUES (${name})
      ON CONFLICT (name) DO NOTHING
      RETURNING *;
    `;
    
    if (rows.length === 0) {
      const [existingCategory] = await sql`SELECT * FROM categories WHERE name = ${name}`;
      return res.status(200).json(existingCategory);
    }
    
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to save category.' });
  }
};
