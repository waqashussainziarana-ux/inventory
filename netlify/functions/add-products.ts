import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const newProducts: any[] = JSON.parse(event.body || '[]');
    if (!Array.isArray(newProducts) || newProducts.length === 0) {
      return { statusCode: 400, body: 'Bad Request: No products provided.' };
    }
    
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      // Start a database transaction
      await client.query('BEGIN');

      for (const product of newProducts) {
        const query = `
          INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        // Ensure all possible fields from the frontend type are accounted for, even if null
        const values = [
          product.id,
          product.productName,
          product.category,
          product.purchaseDate,
          product.purchasePrice,
          product.sellingPrice,
          product.status,
          product.notes || null,
          product.purchaseOrderId || null,
          product.trackingType,
          product.imei || null,
          product.quantity,
          product.customerName || null
        ];
        await client.query(query, values);
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
      return {
        statusCode: 201, // 201 Created
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, added: newProducts.length }),
      };
    } catch (error) {
      // If any query fails, roll back the entire transaction
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }

  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add products.' }),
    };
  }
};

export { handler };
