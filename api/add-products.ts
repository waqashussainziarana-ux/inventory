import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon, SQLExecutable } from '@neondatabase/serverless';
import { Product } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const newProducts: Product[] = req.body;
    if (!Array.isArray(newProducts) || newProducts.length === 0) {
      return res.status(400).json({ error: 'Bad Request: No products provided.' });
    }
    
    const sql = neon(process.env.DATABASE_URL!);
    
    const queries: SQLExecutable[] = newProducts.map(product => sql`
      INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
      VALUES (${product.id}, ${product.productName}, ${product.category}, ${product.purchaseDate}, ${product.purchasePrice}, ${product.sellingPrice}, ${product.status}, ${product.notes || null}, ${product.purchaseOrderId || null}, ${product.trackingType}, ${product.imei || null}, ${product.quantity}, ${product.customerName || null})
      RETURNING *;
    `);

    const transactionResults = await sql.transaction(queries);
    
    const insertedProducts = transactionResults.map(res => res[0]);

    const formattedProducts = insertedProducts.map(p => ({
        ...p,
        purchasePrice: parseFloat(p.purchasePrice),
        sellingPrice: parseFloat(p.sellingPrice),
        quantity: parseInt(p.quantity, 10),
    }));

    return res.status(201).json(formattedProducts);

  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to add products.' });
  }
};
