import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM products ORDER BY "purchaseDate" DESC`;

    const products = rows.map(row => ({
      ...row,
      purchasePrice: parseFloat(row.purchasePrice),
      sellingPrice: parseFloat(row.sellingPrice),
      quantity: parseInt(row.quantity, 10),
    }));

    return res.status(200).json(products);

  } catch (error: any) {
    console.error('Full Database Error in get-products:', error);
    if (error.code === '42P01') {
      return res.status(404).json({ error: 'Database not initialized. Products table missing.', code: 'DB_TABLE_NOT_FOUND' });
    }
    const errorMessage = `Database query failed. Please check connection and logs. Code: ${error.code || 'N/A'}`;
    return res.status(500).json({ error: errorMessage, details: error.message });
  }
}
