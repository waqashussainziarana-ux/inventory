import type { Handler } from '@netlify/functions';
import { neon, SQLExecutable } from '@netlify/neon';
import { InvoiceItem, ProductStatus } from '../../types';
import { randomUUID } from 'crypto';

interface CreateInvoicePayload {
  customerId: string;
  items: Omit<InvoiceItem, 'productName' | 'imei'>[];
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { customerId, items }: CreateInvoicePayload = JSON.parse(event.body || '{}');

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: 'Bad Request: customerId and a non-empty array of items are required.' };
    }

    const sql = neon();
    
    // PRE-TRANSACTION CHECKS & DATA FETCHING
    const productIds = items.map(item => item.productId);
    const [customer] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
    if (!customer) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Customer not found.' }) };
    }
    
    const fetchedProducts = await sql`SELECT * FROM products WHERE id = ANY(${productIds})`;
    const products = fetchedProducts.map(p => ({
        ...p,
        sellingPrice: parseFloat(p.sellingPrice),
        purchasePrice: parseFloat(p.purchasePrice),
        quantity: parseInt(p.quantity, 10),
    }));

    if (products.length !== productIds.length) {
        const foundIds = new Set(products.map(p => p.id));
        const missingIds = productIds.filter(id => !foundIds.has(id));
        return { statusCode: 404, body: JSON.stringify({ error: `One or more products not found: ${missingIds.join(', ')}` }) };
    }

    // PREPARE DATA FOR TRANSACTION
    const totalAmount = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId)!;
        return sum + (product.sellingPrice * item.quantity);
    }, 0);
    
    const [{ count }] = await sql`SELECT count(*) FROM invoices`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count, 10) + 1).padStart(4, '0')}`;
    const issueDate = new Date().toISOString();
    const newInvoiceId = randomUUID(); // Generate UUID here

    // BUILD QUERIES FOR TRANSACTION
    const queries: SQLExecutable[] = [];

    // 1. Insert invoice
    queries.push(sql`
        INSERT INTO invoices (id, "invoiceNumber", "customerId", "issueDate", "totalAmount")
        VALUES (${newInvoiceId}, ${invoiceNumber}, ${customerId}, ${issueDate}, ${totalAmount})
    `);

    // 2. Insert items and update products
    for (const item of items) {
        const product = products.find(p => p.id === item.productId)!;
        
        queries.push(sql`
          INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice")
          VALUES (${newInvoiceId}, ${product.id}, ${product.productName}, ${product.imei || null}, ${item.quantity}, ${product.sellingPrice});
        `);

        if (product.trackingType === 'imei') {
          queries.push(sql`
            UPDATE products
            SET status = ${ProductStatus.Sold}, "customerName" = ${customer.name}, "invoiceId" = ${newInvoiceId}
            WHERE id = ${product.id};
          `);
        } else {
          const newQuantity = product.quantity - item.quantity;
          if (newQuantity < 0) {
              throw new Error(`Insufficient stock for ${product.productName}. Requested: ${item.quantity}, Available: ${product.quantity}`);
          }
          const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
          queries.push(sql`
            UPDATE products
            SET quantity = ${newQuantity}, status = ${newStatus}, "customerName" = ${newStatus === ProductStatus.Sold ? customer.name : null}, "invoiceId" = ${newInvoiceId}
            WHERE id = ${product.id};
          `);
        }
    }

    // EXECUTE TRANSACTION
    await sql.transaction(queries);

    // POST-TRANSACTION: FETCH AND RETURN THE CREATED INVOICE
    const [createdInvoiceRow] = await sql`
        SELECT i.*, c.name as "customerName"
        FROM invoices i
        JOIN customers c ON i."customerId" = c.id
        WHERE i.id = ${newInvoiceId}
    `;

    const createdInvoiceItems = await sql`
        SELECT * FROM invoice_items WHERE "invoiceId" = ${newInvoiceId}
    `;
    
    const finalInvoice = {
      ...createdInvoiceRow,
      totalAmount: parseFloat(createdInvoiceRow.totalAmount),
      items: createdInvoiceItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          imei: item.imei,
          quantity: parseInt(item.quantity, 10),
          sellingPrice: parseFloat(item.sellingPrice),
      }))
    };

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalInvoice),
    };

  } catch (error: any) {
    console.error('Database Error in create-invoice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create invoice.', details: error.message }),
    };
  }
};

export { handler };