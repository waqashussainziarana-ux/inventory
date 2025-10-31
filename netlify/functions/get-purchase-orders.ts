import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

export const handler: Handler = async (event, context) => {
  try {
    const sql = neon();
    const rows = await sql`
        SELECT po.*, s.name as "supplierName"
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po."supplierId" = s.id
        ORDER BY po."issueDate" DESC
    `;

    const purchaseOrders = rows.map(row => ({
      ...row,
      totalCost: parseFloat(row.totalCost),
      productIds: [], // This is populated client-side or not used in list view
    }));
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseOrders),
    };
  } catch (error: any) {
    if (error.code === '42P01') { // undefined_table
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Database not initialized. Purchase Orders table missing.', code: 'DB_TABLE_NOT_FOUND' }),
        };
    }
    return {
        statusCode: 500,
        body: JSON.stringify({ error: `Database query failed for purchase orders. Code: ${error.code || 'N/A'}`, details: error.message }),
    };
  }
};