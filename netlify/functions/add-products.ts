import type { Handler } from '@netlify/functions';
import { neon, SQLExecutable } from '@netlify/neon';
import { Product } from '../../types';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const newProducts: Product[] = JSON.parse(event.body || '[]');
    if (!Array.isArray(newProducts) || newProducts.length === 0) {
      return { statusCode: 400, body: 'Bad Request: No products provided.' };
    }
    
    const sql = neon();
    
    // Create an array of SQL queries for the transaction
    const queries: SQLExecutable[] = newProducts.map(product => sql`
      INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
      VALUES (${product.id}, ${product.productName}, ${product.category}, ${product.purchaseDate}, ${product.purchasePrice}, ${product.sellingPrice}, ${product.status}, ${product.notes || null}, ${product.purchaseOrderId || null}, ${product.trackingType}, ${product.imei || null}, ${product.quantity}, ${product.customerName || null})
      RETURNING *;
    `);

    // Execute all insert queries in a single transaction
    const transactionResults = await sql.transaction(queries);
    
    // Each result in the array is the result of one query
    const insertedProducts = transactionResults.map(res => res[0]);

    const formattedProducts = insertedProducts.map(p => ({
        ...p,
        purchasePrice: parseFloat(p.purchasePrice),
        sellingPrice: parseFloat(p.sellingPrice),
        quantity: parseInt(p.quantity, 10),
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedProducts),
    };

  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add products.' }),
    };
  }
};

export { handler };