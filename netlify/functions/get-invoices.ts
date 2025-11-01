import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon();
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoices),
    };
  } catch (error: any) {
    if (error.code === '42P01') { // undefined_table
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Database not initialized. Invoices table missing.', code: 'DB_TABLE_NOT_FOUND' }),
        };
    }
    return {
        statusCode: 500,
        body: JSON.stringify({ error: `Database query failed for invoices. Code: ${error.code || 'N/A'}`, details: error.message }),
    };
  }
};