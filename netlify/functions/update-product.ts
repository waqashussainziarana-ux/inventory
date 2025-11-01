import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const updatedProduct = JSON.parse(event.body || '{}');
    if (!updatedProduct.id) {
      return { statusCode: 400, body: 'Bad Request: Product ID is required.' };
    }

    const sql = neon();
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
      return { statusCode: 404, body: 'Product not found.' };
    }

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