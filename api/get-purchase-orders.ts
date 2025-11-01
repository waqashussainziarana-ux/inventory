import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
        SELECT po.*, s.name as "supplierName"
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po."supplierId" = s.id
        ORDER BY po."issueDate" DESC
    `;

    const purchaseOrders = rows.map(row => ({
      ...row,
      totalCost: parseFloat(row.totalCost),
      productIds: [],
    }));
    
    return res.status(200).json(purchaseOrders);
  } catch (error: any) {
    console.error('DB Error:', error);
    if (error.code === '42P01') {
        return res.status(404).json({ error: 'Database not initialized. Purchase Orders table missing.', code: 'DB_TABLE_NOT_FOUND' });
    }
    return res.status(500).json({ error: `Database query failed for purchase orders. Code: ${error.code || 'N/A'}`, details: error.message });
  }
};
