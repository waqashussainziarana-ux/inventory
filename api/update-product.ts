import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const updatedProduct = req.body;
    if (!updatedProduct.id) {
      return res.status(400).json({ error: 'Bad Request: Product ID is required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      UPDATE products
      SET "productName" = ${updatedProduct.productName}, 
          category = ${updatedProduct.category}, 
          "purchaseDate" = ${updatedProduct.purchaseDate}, 
          "purchasePrice" = ${updatedProduct.purchasePrice}, 
          "sellingPrice" = ${updatedProduct.sellingPrice},
          status = ${updatedProduct.status}, 
          notes = ${updatedProduct.notes || null}, 
          "invoiceId" = ${updatedProduct.invoiceId || null}, 
          "purchaseOrderId" = ${updatedProduct.purchaseOrderId || null}, 
          "trackingType" = ${updatedProduct.trackingType},
          imei = ${updatedProduct.imei || null}, 
          quantity = ${updatedProduct.quantity}, 
          "customerName" = ${updatedProduct.customerName || null}
      WHERE id = ${updatedProduct.id}
      RETURNING *;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const product = {
      ...rows[0],
      purchasePrice: parseFloat(rows[0].purchasePrice),
      sellingPrice: parseFloat(rows[0].sellingPrice),
      quantity: parseInt(rows[0].quantity, 10),
    };
    
    return res.status(200).json(product);
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
};
