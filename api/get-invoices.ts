import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    const invoices_rows = await sql`
        SELECT i.*, c.name as "customerName"
        FROM invoices i
        LEFT JOIN customers c ON i."customerId" = c.id
        ORDER BY i."issueDate" DESC
    `;
    const invoice_items_rows = await sql`SELECT * FROM invoice_items`;

    const invoices = invoices_rows.map(invoice => {
        const items = invoice_items_rows
            .filter(item => item.invoiceId === invoice.id)
            .map(item => ({
                productId: item.productId,
                productName: item.productName,
                imei: item.imei,
                quantity: parseInt(item.quantity, 10),
                sellingPrice: parseFloat(item.sellingPrice),
            }));
        return {
            ...invoice,
            totalAmount: parseFloat(invoice.totalAmount),
            items: items,
        };
    });

    return res.status(200).json(invoices);
  } catch (error: any) {
    console.error('DB Error:', error);
    if (error.code === '42P01') { // undefined_table
        return res.status(404).json({ error: 'Database not initialized. Invoices table missing.', code: 'DB_TABLE_NOT_FOUND' });
    }
    return res.status(500).json({ error: `Database query failed for invoices. Code: ${error.code || 'N/A'}`, details: error.message });
  }
};
