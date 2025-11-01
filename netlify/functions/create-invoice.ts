import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';
import { InvoiceItem, ProductStatus } from '../../types';

interface CreateInvoicePayload {
  customerId: string;
  items: Omit<InvoiceItem, 'productName' | 'imei'>[];
}

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let invoiceNumber: string;

  try {
    const { customerId, items }: CreateInvoicePayload = JSON.parse(event.body || '{}');

    if (!customerId || !items || items.length === 0) {
      return { statusCode: 400, body: 'Bad Request: customerId and items are required.' };
    }

    const sql = neon();
    
    const productIds = items.map(item => item.productId);
    const [customer] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
    
    const fetchedProducts = await sql`SELECT * FROM products WHERE id = ANY(${productIds})`;

    const products = fetchedProducts.map(p => ({
        ...p,
        sellingPrice: parseFloat(p.sellingPrice),
        purchasePrice: parseFloat(p.purchasePrice),
        quantity: parseInt(p.quantity, 10),
    }));

    if (!customer) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Customer not found.' }) };
    }
    if (products.length !== productIds.length) {
        const foundIds = new Set(products.map(p => p.id));
        const missingIds = productIds.filter(id => !foundIds.has(id));
        return { statusCode: 404, body: JSON.stringify({ error: `One or more products not found: ${missingIds.join(', ')}` }) };
    }
    
    // This transaction block now ONLY performs writes. It does not return data.
    await sql.transaction(async (tx) => {
        const totalAmount = items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId)!;
            return sum + (product.sellingPrice * item.quantity);
        }, 0);
        
        const invoiceCountResult = await tx`SELECT count(*) FROM invoices`;
        const invoiceCount = parseInt(invoiceCountResult[0].count, 10);
        invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
        const issueDate = new Date().toISOString();

        const [invoiceRow] = await tx`
            INSERT INTO invoices ("invoiceNumber", "customerId", "issueDate", "totalAmount")
            VALUES (${invoiceNumber}, ${customerId}, ${issueDate}, ${totalAmount})
            RETURNING id;
        `;

        for (const item of items) {
            const product = products.find(p => p.id === item.productId)!;
            
            await tx`
              INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice")
              VALUES (${invoiceRow.id}, ${product.id}, ${product.productName}, ${product.imei || null}, ${item.quantity}, ${product.sellingPrice});
            `;

            if (product.trackingType === 'imei') {
              await tx`
                UPDATE products
                SET status = ${ProductStatus.Sold}, "customerName" = ${customer.name}, "invoiceId" = ${invoiceRow.id}
                WHERE id = ${product.id};
              `;
            } else {
              const newQuantity = product.quantity - item.quantity;
              if (newQuantity < 0) {
                  throw new Error(`Insufficient stock for ${product.productName}. Requested: ${item.quantity}, Available: ${product.quantity}`);
              }
              const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
              await tx`
                UPDATE products
                SET quantity = ${newQuantity}, status = ${newStatus}, "customerName" = ${newStatus === ProductStatus.Sold ? customer.name : null}, "invoiceId" = ${invoiceRow.id}
                WHERE id = ${product.id};
              `;
            }
        }
    });

    // After the transaction is successful, fetch the created invoice to return it.
    const [createdInvoiceRow] = await sql`
        SELECT i.*, c.name as "customerName"
        FROM invoices i
        JOIN customers c ON i."customerId" = c.id
        WHERE i."invoiceNumber" = ${invoiceNumber}
    `;

    const createdInvoiceItems = await sql`
        SELECT * FROM invoice_items WHERE "invoiceId" = ${createdInvoiceRow.id}
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