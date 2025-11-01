import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon, SQLExecutable } from '@neondatabase/serverless';
import { Product, ProductStatus, InvoiceItem, Customer, Supplier, NewProductInfo, PurchaseOrderStatus } from '../../types';
import { randomUUID } from 'crypto';

type ProductBatch = {
    productInfo: NewProductInfo;
    details: { trackingType: 'imei', imeis: string[] } | { trackingType: 'quantity', quantity: number };
};
interface CreatePOPayload {
    poDetails: { supplierId: string, poNumber: string, status: PurchaseOrderStatus, notes?: string };
    productsData: ProductBatch[];
}
interface CreateInvoicePayload {
  customerId: string;
  items: Omit<InvoiceItem, 'productName' | 'imei'>[];
}


// Generic Error Handler
function handleError(res: VercelResponse, error: any, resourceName: string) {
    console.error(`Full Database Error in ${resourceName}:`, error);
    if (error.code === '42P01') { // undefined_table
        return res.status(404).json({ error: `Database not initialized. ${resourceName} table missing.`, code: 'DB_TABLE_NOT_FOUND' });
    }
    const errorMessage = `Database query failed for ${resourceName}. Code: ${error.code || 'N/A'}`;
    return res.status(500).json({ error: errorMessage, details: error.message });
}


// --- ENTITY HANDLERS ---

async function handleProducts(req: VercelRequest, res: VercelResponse, sql: any) {
    try {
        switch (req.method) {
            case 'GET': {
                const rows = await sql`SELECT * FROM products ORDER BY "purchaseDate" DESC`;
                const products = rows.map((row: any) => ({
                    ...row,
                    purchasePrice: parseFloat(row.purchasePrice),
                    sellingPrice: parseFloat(row.sellingPrice),
                    quantity: parseInt(row.quantity, 10),
                }));
                return res.status(200).json(products);
            }
            case 'POST': {
                 const newProducts: Product[] = req.body;
                if (!Array.isArray(newProducts) || newProducts.length === 0) {
                    return res.status(400).json({ error: 'Bad Request: No products provided.' });
                }
                const queries: SQLExecutable[] = newProducts.map(product => sql`
                    INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
                    VALUES (${product.id}, ${product.productName}, ${product.category}, ${product.purchaseDate}, ${product.purchasePrice}, ${product.sellingPrice}, ${product.status}, ${product.notes || null}, ${product.purchaseOrderId || null}, ${product.trackingType}, ${product.imei || null}, ${product.quantity}, ${product.customerName || null})
                    RETURNING *;
                `);
                const transactionResults = await sql.transaction(queries);
                const insertedProducts = transactionResults.map((res: any) => res[0]);
                const formattedProducts = insertedProducts.map((p: any) => ({
                    ...p,
                    purchasePrice: parseFloat(p.purchasePrice),
                    sellingPrice: parseFloat(p.sellingPrice),
                    quantity: parseInt(p.quantity, 10),
                }));
                return res.status(201).json(formattedProducts);
            }
            case 'PUT': {
                const updatedProduct = req.body;
                if (!updatedProduct.id) {
                    return res.status(400).json({ error: 'Bad Request: Product ID is required.' });
                }
                const rows = await sql`
                    UPDATE products
                    SET "productName" = ${updatedProduct.productName}, category = ${updatedProduct.category}, "purchaseDate" = ${updatedProduct.purchaseDate}, "purchasePrice" = ${updatedProduct.purchasePrice}, "sellingPrice" = ${updatedProduct.sellingPrice}, status = ${updatedProduct.status}, notes = ${updatedProduct.notes || null}, "invoiceId" = ${updatedProduct.invoiceId || null}, "purchaseOrderId" = ${updatedProduct.purchaseOrderId || null}, "trackingType" = ${updatedProduct.trackingType}, imei = ${updatedProduct.imei || null}, quantity = ${updatedProduct.quantity}, "customerName" = ${updatedProduct.customerName || null}
                    WHERE id = ${updatedProduct.id}
                    RETURNING *;
                `;
                if (rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
                const product = {
                    ...rows[0],
                    purchasePrice: parseFloat(rows[0].purchasePrice),
                    sellingPrice: parseFloat(rows[0].sellingPrice),
                    quantity: parseInt(rows[0].quantity, 10),
                };
                return res.status(200).json(product);
            }
            case 'DELETE': {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: 'Bad Request: Product ID is required.' });
                const result = await sql`DELETE FROM products WHERE id = ${id}`;
                if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found.' });
                return res.status(200).json({ success: true });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'products');
    }
}

async function handleCustomers(req: VercelRequest, res: VercelResponse, sql: any) {
    try {
        switch (req.method) {
            case 'GET': {
                const rows = await sql`SELECT * FROM customers ORDER BY name ASC`;
                return res.status(200).json(rows);
            }
            case 'POST': {
                const customer: Partial<Customer> = req.body;
                if (!customer.name || !customer.phone) return res.status(400).json({ error: 'Bad Request: Name and phone are required.' });
                let rows;
                if (customer.id) {
                    rows = await sql`UPDATE customers SET name = ${customer.name}, phone = ${customer.phone} WHERE id = ${customer.id} RETURNING *;`;
                } else {
                    rows = await sql`INSERT INTO customers (name, phone) VALUES (${customer.name}, ${customer.phone}) RETURNING *;`;
                }
                return res.status(200).json(rows[0]);
            }
            case 'DELETE': {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: 'Bad Request: Customer ID is required.' });
                await sql`DELETE FROM customers WHERE id = ${id}`;
                return res.status(200).json({ success: true });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'customers');
    }
}

async function handleCategories(req: VercelRequest, res: VercelResponse, sql: any) {
     try {
        switch (req.method) {
            case 'GET': {
                const rows = await sql`SELECT * FROM categories ORDER BY name ASC`;
                return res.status(200).json(rows);
            }
            case 'POST': {
                const { name } = req.body;
                if (!name) return res.status(400).json({ error: 'Bad Request: Category name is required.' });
                const rows = await sql`INSERT INTO categories (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING RETURNING *;`;
                if (rows.length === 0) {
                    const [existingCategory] = await sql`SELECT * FROM categories WHERE name = ${name}`;
                    return res.status(200).json(existingCategory);
                }
                return res.status(201).json(rows[0]);
            }
            case 'DELETE': {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: 'Bad Request: Category ID is required.' });
                await sql`DELETE FROM categories WHERE id = ${id}`;
                return res.status(200).json({ success: true });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'categories');
    }
}

async function handleSuppliers(req: VercelRequest, res: VercelResponse, sql: any) {
     try {
        switch (req.method) {
            case 'GET': {
                const rows = await sql`SELECT * FROM suppliers ORDER BY name ASC`;
                return res.status(200).json(rows);
            }
            case 'POST': {
                const supplier: Partial<Supplier> = req.body;
                if (!supplier.name) return res.status(400).json({ error: 'Bad Request: Name is required.' });
                let rows;
                if (supplier.id) {
                    rows = await sql`UPDATE suppliers SET name = ${supplier.name}, email = ${supplier.email || null}, phone = ${supplier.phone || null} WHERE id = ${supplier.id} RETURNING *;`;
                } else {
                    rows = await sql`INSERT INTO suppliers (name, email, phone) VALUES (${supplier.name}, ${supplier.email || null}, ${supplier.phone || null}) ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone RETURNING *;`;
                }
                return res.status(200).json(rows[0]);
            }
            case 'DELETE': {
                const { id } = req.body;
                if (!id) return res.status(400).json({ error: 'Bad Request: Supplier ID is required.' });
                await sql`DELETE FROM suppliers WHERE id = ${id}`;
                return res.status(200).json({ success: true });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'suppliers');
    }
}

async function handleInvoices(req: VercelRequest, res: VercelResponse, sql: any) {
    try {
        switch (req.method) {
            case 'GET': {
                const invoices_rows = await sql`
                    SELECT i.*, c.name as "customerName" FROM invoices i
                    LEFT JOIN customers c ON i."customerId" = c.id
                    ORDER BY i."issueDate" DESC
                `;
                const invoice_items_rows = await sql`SELECT * FROM invoice_items`;
                const invoices = invoices_rows.map((invoice: any) => {
                    const items = invoice_items_rows
                        .filter((item: any) => item.invoiceId === invoice.id)
                        .map((item: any) => ({
                            productId: item.productId, productName: item.productName, imei: item.imei,
                            quantity: parseInt(item.quantity, 10), sellingPrice: parseFloat(item.sellingPrice),
                        }));
                    return { ...invoice, totalAmount: parseFloat(invoice.totalAmount), items };
                });
                return res.status(200).json(invoices);
            }
            case 'POST': {
                const { customerId, items }: CreateInvoicePayload = req.body;
                if (!customerId || !Array.isArray(items) || items.length === 0) {
                    return res.status(400).json({ error: 'Bad Request: customerId and a non-empty array of items are required.' });
                }
                const productIds = items.map(item => item.productId);
                const [customer] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
                if (!customer) return res.status(404).json({ error: 'Customer not found.' });

                const fetchedProducts = await sql`SELECT * FROM products WHERE id = ANY(${productIds})`;
                const products = fetchedProducts.map((p:any) => ({ ...p, sellingPrice: parseFloat(p.sellingPrice), quantity: parseInt(p.quantity, 10) }));

                const totalAmount = items.reduce((sum, item) => {
                    const product = products.find((p: any) => p.id === item.productId)!;
                    return sum + (product.sellingPrice * item.quantity);
                }, 0);
                
                const [{ count }] = await sql`SELECT count(*) FROM invoices`;
                const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(count, 10) + 1).padStart(4, '0')}`;
                const newInvoiceId = randomUUID();
                
                const queries: SQLExecutable[] = [
                    sql`INSERT INTO invoices (id, "invoiceNumber", "customerId", "issueDate", "totalAmount") VALUES (${newInvoiceId}, ${invoiceNumber}, ${customerId}, ${new Date().toISOString()}, ${totalAmount})`
                ];

                for (const item of items) {
                    const product = products.find((p: any) => p.id === item.productId)!;
                    queries.push(sql`INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice") VALUES (${newInvoiceId}, ${product.id}, ${product.productName}, ${product.imei || null}, ${item.quantity}, ${product.sellingPrice});`);
                    if (product.trackingType === 'imei') {
                        queries.push(sql`UPDATE products SET status = ${ProductStatus.Sold}, "customerName" = ${customer.name}, "invoiceId" = ${newInvoiceId} WHERE id = ${product.id};`);
                    } else {
                        const newQuantity = product.quantity - item.quantity;
                        if (newQuantity < 0) throw new Error(`Insufficient stock for ${product.productName}.`);
                        queries.push(sql`UPDATE products SET quantity = ${newQuantity}, status = ${newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold} WHERE id = ${product.id};`);
                    }
                }

                await sql.transaction(queries);

                const [createdInvoiceRow] = await sql`SELECT i.*, c.name as "customerName" FROM invoices i JOIN customers c ON i."customerId" = c.id WHERE i.id = ${newInvoiceId}`;
                const createdInvoiceItems = await sql`SELECT * FROM invoice_items WHERE "invoiceId" = ${newInvoiceId}`;
                const finalInvoice = {
                    ...createdInvoiceRow,
                    totalAmount: parseFloat(createdInvoiceRow.totalAmount),
                    items: createdInvoiceItems.map((item: any) => ({
                        productId: item.productId, productName: item.productName, imei: item.imei,
                        quantity: parseInt(item.quantity, 10), sellingPrice: parseFloat(item.sellingPrice),
                    }))
                };
                return res.status(201).json(finalInvoice);
            }
            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'invoices');
    }
}

async function handlePurchaseOrders(req: VercelRequest, res: VercelResponse, sql: any) {
    try {
        switch (req.method) {
            case 'GET': {
                 const rows = await sql`
                    SELECT po.*, s.name as "supplierName" FROM purchase_orders po
                    LEFT JOIN suppliers s ON po."supplierId" = s.id
                    ORDER BY po."issueDate" DESC
                `;
                const purchaseOrders = rows.map((row: any) => ({ ...row, totalCost: parseFloat(row.totalCost), productIds: [] }));
                return res.status(200).json(purchaseOrders);
            }
            case 'POST': {
                const { poDetails, productsData }: CreatePOPayload = req.body;
                if (!poDetails || !productsData || !poDetails.supplierId || !poDetails.poNumber) {
                    return res.status(400).json({ error: 'Bad Request: Missing required PO data.' });
                }
                const [supplier] = await sql`SELECT * FROM suppliers WHERE id = ${poDetails.supplierId}`;
                if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

                let totalCost = 0;
                const productsToInsert = [];
                const newPoId = randomUUID();

                for (const batch of productsData) {
                    const commonData = { ...batch.productInfo, status: ProductStatus.Available, purchaseOrderId: newPoId };
                    if (batch.details.trackingType === 'imei') {
                        for (const imei of batch.details.imeis) {
                            productsToInsert.push({ ...commonData, id: randomUUID(), imei, quantity: 1, trackingType: 'imei' as const });
                            totalCost += commonData.purchasePrice;
                        }
                    } else {
                        productsToInsert.push({ ...commonData, id: randomUUID(), imei: null, quantity: batch.details.quantity, trackingType: 'quantity' as const });
                        totalCost += commonData.purchasePrice * batch.details.quantity;
                    }
                }
                const queries: SQLExecutable[] = [
                    sql`INSERT INTO purchase_orders (id, "poNumber", "supplierId", "issueDate", "totalCost", status, notes) VALUES (${newPoId}, ${poDetails.poNumber}, ${poDetails.supplierId}, ${new Date().toISOString()}, ${totalCost}, ${poDetails.status}, ${poDetails.notes || null})`
                ];
                for (const p of productsToInsert) {
                    queries.push(sql`INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity) VALUES (${p.id}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, ${p.status}, ${p.notes}, ${p.purchaseOrderId}, ${p.trackingType}, ${p.imei}, ${p.quantity})`);
                }
                await sql.transaction(queries);
                
                const [createdPoRow] = await sql`SELECT * FROM purchase_orders WHERE id = ${newPoId}`;
                const finalPO = { ...createdPoRow, supplierName: supplier.name, totalCost: parseFloat(createdPoRow.totalCost), productIds: productsToInsert.map(p => p.id) };
                return res.status(201).json({ po: finalPO });
            }
            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        return handleError(res, error, 'purchase_orders');
    }
}

async function handleDbSetup(req: VercelRequest, res: VercelResponse, sql: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    try {
        await sql.transaction([
            sql`CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL UNIQUE, email VARCHAR(255), phone VARCHAR(50));`,
            sql`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL);`,
            sql`CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL UNIQUE);`,
            sql`CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "poNumber" VARCHAR(255) NOT NULL UNIQUE, "supplierId" UUID REFERENCES suppliers(id), "issueDate" DATE NOT NULL, "totalCost" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT);`,
            sql`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceNumber" VARCHAR(255) NOT NULL UNIQUE, "customerId" UUID REFERENCES customers(id), "issueDate" DATE NOT NULL, "totalAmount" NUMERIC(10, 2) NOT NULL);`,
            sql`CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "productName" VARCHAR(255) NOT NULL, category VARCHAR(255), "purchaseDate" DATE NOT NULL, "purchasePrice" NUMERIC(10, 2) NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT, "invoiceId" VARCHAR(255), "purchaseOrderId" VARCHAR(255), "trackingType" VARCHAR(50) NOT NULL, imei VARCHAR(255) UNIQUE, quantity INTEGER NOT NULL, "customerName" VARCHAR(255));`,
            sql`CREATE TABLE IF NOT EXISTS invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE, "productId" UUID, "productName" VARCHAR(255) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL);`,
        ]);
        const [{ count: catCount }] = await sql`SELECT COUNT(*) FROM categories`;
        if (Number(catCount) === 0) await sql`INSERT INTO categories (name) VALUES ('Smartphones'), ('Laptops'), ('Accessories'), ('Tablets');`;
        const [{ count: custCount }] = await sql`SELECT COUNT(*) FROM customers`;
        if (Number(custCount) === 0) await sql`INSERT INTO customers (name, phone) VALUES ('Walk-in Customer', 'N/A');`;
        const [{ count: suppCount }] = await sql`SELECT COUNT(*) FROM suppliers`;
        if (Number(suppCount) === 0) await sql`INSERT INTO suppliers (name, email, phone) VALUES ('Default Supplier', 'contact@default.com', '123-456-7890');`;
        return res.status(200).json({ message: 'Database initialized successfully.' });
    } catch (error) {
        return handleError(res, error, 'database_setup');
    }
}

// --- MAIN HANDLER / ROUTER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Vercel's rewrite gives us the original path in x-rewritten-path
    const path = (req.headers['x-rewritten-path'] as string) || req.url!;
    const endpoint = path.split('/')[2]?.split('?')[0] || '';

    switch (endpoint) {
        case 'products':
            return handleProducts(req, res, sql);
        case 'customers':
            return handleCustomers(req, res, sql);
        case 'categories':
            return handleCategories(req, res, sql);
        case 'suppliers':
            return handleSuppliers(req, res, sql);
        case 'invoices':
            return handleInvoices(req, res, sql);
        case 'purchase-orders':
            return handlePurchaseOrders(req, res, sql);
        case 'setup':
            return handleDbSetup(req, res, sql);
        default:
            return res.status(404).json({ error: 'Endpoint not found' });
    }
}