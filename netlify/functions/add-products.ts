import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';
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
    
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const insertedProducts = [];

      for (const product of newProducts) {
        const query = `
          INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *;
        `;
        const values = [
          product.id, product.productName, product.category, product.purchaseDate,
          product.purchasePrice, product.sellingPrice, product.status, product.notes || null,
          product.purchaseOrderId || null, product.trackingType, product.imei || null,
          product.quantity, product.customerName || null
        ];
        const { rows } = await client.query(query, values);
        insertedProducts.push(rows[0]);
      }
      
      await client.query('COMMIT');
      
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
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
