import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM categories ORDER BY name ASC`;
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('Full Database Error in get-categories:', error);
     if (error.code === '42P01') { // undefined_table
        return res.status(404).json({ error: 'Database not initialized. Categories table missing.', code: 'DB_TABLE_NOT_FOUND' });
    }
    const errorMessage = `Database query failed for categories. Code: ${error.code || 'N/A'}`;
    return res.status(500).json({ error: errorMessage, details: error.message });
  }
};
