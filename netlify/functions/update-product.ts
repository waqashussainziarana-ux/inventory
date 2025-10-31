import type { Handler } from '@netlify/functions';
import { getDbPool } from './db';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const updatedProduct = JSON.parse(event.body || '{}');
    if (!updatedProduct.id) {
      return { statusCode: 400, body: 'Bad Request: Product ID is required.' };
    }

    const pool = getDbPool();
    const query = `
      UPDATE products
      SET "productName" = $1, category = $2, "purchaseDate" = $3, "purchasePrice" = $4, "sellingPrice" = $5,
          status = $6, notes = $7, "invoiceId" = $8, "purchaseOrderId" = $9, "trackingType" = $10,
          imei = $11, quantity = $12, "customerName" = $13
      WHERE id = $14
      RETURNING *;
    `;
    const values = [
      updatedProduct.productName, updatedProduct.category, updatedProduct.purchaseDate, updatedProduct.purchasePrice,
      updatedProduct.sellingPrice, updatedProduct.status, updatedProduct.notes || null, updatedProduct.invoiceId || null,
      updatedProduct.purchaseOrderId || null, updatedProduct.trackingType, updatedProduct.imei || null, updatedProduct.quantity,
      updatedProduct.customerName || null, updatedProduct.id
    ];
    
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return { statusCode: 404, body: 'Product not found.' };
    }

    // Convert numeric types from string back to number for the response
    const product = {
      ...rows[0],
      purchasePrice: parseFloat(rows[0].purchasePrice),
      sellingPrice: parseFloat(rows[0].sellingPrice),
      quantity: parseInt(rows[0].quantity, 10),
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update product.' }),
    };
  }
};

export { handler };
