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

  try {
    const { customerId, items }: CreateInvoicePayload = JSON.parse(event.body || '{}');

    if (!customerId || !items || items.length === 0) {
      return { statusCode: 400, body: 'Bad Request: customerId and items are required.' };
    }

    const sql = neon();
    
    const productIds = items.map(item => item.productId);
    const [customer] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
    
    const fetchedProducts = await sql`SELECT * FROM products WHERE id IN ${sql(productIds)}`;

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
    
    const [createdInvoice] = await sql.transaction(async (tx) => {
        const totalAmount = items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId)!;
            return sum + (product.sellingPrice * item.quantity);
        }, 0);
        
        const invoiceCountResult = await tx`SELECT count(*) FROM invoices`;
        const invoiceCount = parseInt(invoiceCountResult[0].count, 10);
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
        const issueDate = new Date().toISOString();

        const [invoiceRow] = await tx`
            INSERT INTO invoices ("invoiceNumber", "customerId", "issueDate", "totalAmount")
            VALUES (${invoiceNumber}, ${customerId}, ${issueDate}, ${totalAmount})
            RETURNING *;
        `;

        const queries = [];
        const invoiceItemsForResponse: any[] = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.productId)!;
            
            invoiceItemsForResponse.push({
              productId: product.id,
              quantity: item.quantity,
              sellingPrice: product.sellingPrice,
              productName: product.productName,
              imei: product.imei,
            });

            queries.push(tx`
              INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice")
              VALUES (${invoiceRow.id}, ${product.id}, ${product.productName}, ${product.imei || null}, ${item.quantity}, ${product.sellingPrice});
            `);

            if (product.trackingType === 'imei') {
              queries.push(tx`
                UPDATE products
                SET status = ${ProductStatus.Sold}, "customerName" = ${customer.name}, "invoiceId" = ${invoiceRow.id}
                WHERE id = ${product.id};
              `);
            } else {
              const newQuantity = product.quantity - item.quantity;
              if (newQuantity < 0) {
                  throw new Error(`Insufficient stock for ${product.productName}. Requested: ${item.quantity}, Available: ${product.quantity}`);
              }
              const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
              queries.push(tx`
                UPDATE products
                SET quantity = ${newQuantity}, status = ${newStatus}, "customerName" = ${newStatus === ProductStatus.Sold ? customer.name : null}, "invoiceId" = ${invoiceRow.id}
                WHERE id = ${product.id};
              `);
            }
        }
        
        if (queries.length > 0) {
            await tx.transaction(queries);
        }
        
        const finalInvoice = { 
            ...invoiceRow,
            customerName: customer.name,
            totalAmount: parseFloat(invoiceRow.totalAmount),
            items: invoiceItemsForResponse
        };
        return [finalInvoice];
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createdInvoice),
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