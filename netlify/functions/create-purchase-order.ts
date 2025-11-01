import type { Handler } from '@netlify/functions';
import { neon, SQLExecutable } from '@netlify/neon';
import { NewProductInfo, ProductStatus, PurchaseOrderStatus } from '../../types';
import { randomUUID } from 'crypto';

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

    // --- 1. PREPARE ALL DATA OUTSIDE TRANSACTION ---
    let totalCost = 0;
    const productsToInsert = [];
    const newPoId = randomUUID();
    const issueDate = new Date().toISOString();

    for (const batch of productsData) {
        const commonProductData = {
            productName: batch.productInfo.productName,
            category: batch.productInfo.category,
            purchaseDate: batch.productInfo.purchaseDate,
            purchasePrice: batch.productInfo.purchasePrice,
            sellingPrice: batch.productInfo.sellingPrice,
            status: ProductStatus.Available,
            notes: batch.productInfo.notes || null,
            purchaseOrderId: newPoId,
            customerName: null,
            invoiceId: null,
        };

        if (batch.details.trackingType === 'imei') {
            for (const imei of batch.details.imeis) {
                const product = { 
                    ...commonProductData, 
                    id: randomUUID(),
                    imei, 
                    quantity: 1, 
                    trackingType: 'imei' as const 
                };
                productsToInsert.push(product);
                totalCost += product.purchasePrice;
            }
        } else {
            const product = { 
                ...commonProductData,
                id: randomUUID(),
                imei: null, 
                quantity: batch.details.quantity, 
                trackingType: 'quantity' as const 
            };
            productsToInsert.push(product);
            totalCost += product.purchasePrice * product.quantity;
        }
    }

    // --- 2. BUILD QUERY ARRAY ---
    const queries: SQLExecutable[] = [];

    queries.push(sql`
        INSERT INTO purchase_orders (id, "poNumber", "supplierId", "issueDate", "totalCost", status, notes)
        VALUES (${newPoId}, ${poDetails.poNumber}, ${poDetails.supplierId}, ${issueDate}, ${totalCost}, ${poDetails.status}, ${poDetails.notes || null})
    `);

    for (const p of productsToInsert) {
        queries.push(sql`
            INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName", "invoiceId")
            VALUES (${p.id}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, ${p.status}, ${p.notes}, ${p.purchaseOrderId}, ${p.trackingType}, ${p.imei}, ${p.quantity}, ${p.customerName}, ${p.invoiceId})
        `);
    }

    // --- 3. EXECUTE TRANSACTION ---
    if (queries.length > 0) {
        await sql.transaction(queries);
    }
    
    // --- 4. FETCH AND RETURN CREATED DATA ---
    const [createdPoRow] = await sql`
        SELECT * FROM purchase_orders WHERE id = ${newPoId}
    `;
    const createdProductRows = await sql`
        SELECT * FROM products WHERE "purchaseOrderId" = ${newPoId}
    `;

    const finalPO = {
        ...createdPoRow,
        supplierName: supplier.name,
        totalCost: parseFloat(createdPoRow.totalCost),
        productIds: createdProductRows.map(p => p.id)
    };
    
    const newProducts = createdProductRows.map(p => ({
        ...p,
        purchasePrice: parseFloat(p.purchasePrice),
        sellingPrice: parseFloat(p.sellingPrice),
        quantity: parseInt(p.quantity, 10),
    }));

    return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ po: finalPO, newProducts }),
    };

  } catch (error: any) {
    console.error('Database Error in create-purchase-order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create purchase order.', details: error.message }),
    };
  }
};

export { handler };