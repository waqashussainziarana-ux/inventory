import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon, SQLExecutable } from '@neondatabase/serverless';
import { InvoiceItem, ProductStatus } from '../../types';
import { randomUUID } from 'crypto';

interface CreateInvoicePayload {
  customerId: string;
  items: Omit<InvoiceItem, 'productName' | 'imei'>[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { customerId, items }: CreateInvoicePayload = req.body;

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Bad Request: customerId and a non-empty array of items are required.' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    const productIds = items.map(item => item.productId);
    const [customer] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
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
        return res.status(404).json({ error: `One or more products not found: ${missingIds.join(', ')}` });
    }

    const totalAmount = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId)!;
        return sum + (product.sellingPrice * item.quantity);
    }, 0);
    
    const [{ count }] = await sql`SELECT count(*) FROM invoices`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count, 10) + 1).padStart(4, '0')}`;
    const issueDate = new Date().toISOString();
    const newInvoiceId = randomUUID();

    const queries: SQLExecutable[] = [];

    queries.push(sql`
        INSERT INTO invoices (id, "invoiceNumber", "customerId", "issueDate", "totalAmount")
        VALUES (${newInvoiceId}, ${invoiceNumber}, ${customerId}, ${issueDate}, ${totalAmount})
    `);

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

    await sql.transaction(queries);

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

    return res.status(201).json(finalInvoice);

  } catch (error: any) {
    console.error('Database Error in create-invoice:', error);
    return res.status(500).json({ error: 'Failed to create invoice.', details: error.message });
  }
};
