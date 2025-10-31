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
    const products = await sql`SELECT * FROM products WHERE id IN ${productIds}`;

    if (!customer) {
        return { statusCode: 404, body: 'Customer not found.' };
    }
    if (products.length !== productIds.length) {
        return { statusCode: 404, body: 'One or more products not found.' };
    }
    
    const [createdInvoice] = await sql.transaction(async (tx) => {
        const totalAmount = items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId)!;
            return sum + (product.sellingPrice * item.quantity);
        }, 0);
        
        const invoiceCountResult = await tx`SELECT count(*) FROM invoices`;
        const invoiceCount = parseInt(invoiceCountResult[0].count, 10);
        const invoiceNumber = `#${invoiceCount + 1}`;
        const issueDate = new Date().toISOString();

        const [invoiceRow] = await tx`
            INSERT INTO invoices ("invoiceNumber", "customerId", "issueDate", "totalAmount")
            VALUES (${invoiceNumber}, ${customerId}, ${issueDate}, ${totalAmount})
            RETURNING *;
        `;

        const invoiceItemsForResponse: any[] = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.productId)!;
            
            const newItem = {
              productId: product.id,
              quantity: item.quantity,
              sellingPrice: product.sellingPrice,
              productName: product.productName,
              imei: product.imei,
            };
            invoiceItemsForResponse.push(newItem);

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
              const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
              await tx`
                UPDATE products
                SET quantity = ${newQuantity}, status = ${newStatus}
                WHERE id = ${product.id};
              `;
            }
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

  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create invoice.' }),
    };
  }
};

export { handler };