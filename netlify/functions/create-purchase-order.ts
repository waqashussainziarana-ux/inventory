import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { NewProductInfo, ProductStatus, PurchaseOrderStatus } from '../../types';

type ProductBatch = {
    productInfo: NewProductInfo;
    details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number };
};

interface CreatePOPayload {
    poDetails: { supplierId: string, poNumber: string, status: PurchaseOrderStatus, notes?: string };
    productsData: ProductBatch[];
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { poDetails, productsData }: CreatePOPayload = JSON.parse(event.body || '{}');

    if (!poDetails || !productsData || !poDetails.supplierId || !poDetails.poNumber) {
        return { statusCode: 400, body: 'Bad Request: Missing required PO data.' };
    }

    const sql = neon();
    const [supplier] = await sql`SELECT * FROM suppliers WHERE id = ${poDetails.supplierId}`;
    if (!supplier) {
        return { statusCode: 404, body: 'Supplier not found.' };
    }

    const [{po, newProducts}] = await sql.transaction(async (tx) => {
        let totalCost = 0;
        const allNewProducts = [];
        for (const batch of productsData) {
            if (batch.details.trackingType === 'imei') {
                for (const imei of batch.details.imeis) {
                    const product = { ...batch.productInfo, imei, quantity: 1, trackingType: 'imei' as const };
                    allNewProducts.push(product);
                    totalCost += product.purchasePrice;
                }
            } else {
                const product = { ...batch.productInfo, quantity: batch.details.quantity, trackingType: 'quantity' as const };
                allNewProducts.push(product);
                totalCost += product.purchasePrice * product.quantity;
            }
        }

        const [poRow] = await tx`
            INSERT INTO purchase_orders ("poNumber", "supplierId", "issueDate", "totalCost", status, notes)
            VALUES (${poDetails.poNumber}, ${poDetails.supplierId}, ${new Date().toISOString()}, ${totalCost}, ${poDetails.status}, ${poDetails.notes || null})
            RETURNING *;
        `;
        
        const insertedProducts = [];
        for (const p of allNewProducts) {
            const [newProductRow] = await tx`
              INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity)
              VALUES (${crypto.randomUUID()}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, ${ProductStatus.Available}, ${p.notes || null}, ${poRow.id}, ${p.trackingType}, ${p.imei || null}, ${p.quantity})
              RETURNING *;
            `;
            insertedProducts.push({
                ...newProductRow,
                purchasePrice: parseFloat(newProductRow.purchasePrice),
                sellingPrice: parseFloat(newProductRow.sellingPrice),
                quantity: parseInt(newProductRow.quantity, 10),
            });
        }

        const finalPO = { ...poRow, supplierName: supplier.name, totalCost: parseFloat(poRow.totalCost), productIds: insertedProducts.map(p => p.id) };
        return [{ po: finalPO, newProducts: insertedProducts }];
    });

    return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po, newProducts }),
    };

  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create purchase order.' }),
    };
  }
};

export { handler };