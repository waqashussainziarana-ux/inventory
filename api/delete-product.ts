import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Bad Request: Product ID is required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const result = await sql`DELETE FROM products WHERE id = ${id}`;
    
    if (result.rowCount === 0) {
         return res.status(404).json({ error: 'Product not found.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
};
