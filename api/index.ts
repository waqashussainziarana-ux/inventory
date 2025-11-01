import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { Product, ProductStatus, Invoice, InvoiceItem, Customer, Supplier, NewProduct, NewProductInfo, PurchaseOrderStatus } from '../types';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';

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
                 const newProductsData: NewProduct[] = req.body;
                if (!Array.isArray(newProductsData) || newProductsData.length === 0) {
                    return res.status(400).json({ error: 'Bad Request: No products provided.' });
                }

                // Generate IDs on the server
                const newProductsWithIds: Product[] = newProductsData.map(p => ({ ...p, id: randomUUID() }));

                const queries = newProductsWithIds.map(product => sql`
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
                    rows = await sql`INSERT INTO customers (id, name, phone) VALUES (${randomUUID()}, ${customer.name}, ${customer.phone}) RETURNING *;`;
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
                
                // Atomically insert the category, ignoring if it already exists. This prevents race conditions.
                await sql`INSERT INTO categories (id, name) VALUES (${randomUUID()}, ${name}) ON CONFLICT (name) DO NOTHING;`;
                
                // Now, unconditionally fetch the category by its unique name.
                // This guarantees we return the correct, existing or newly-created, category.
                const categoryRows = await sql`SELECT * FROM categories WHERE name = ${name}`;
                const category = categoryRows[0];

                if (!category) {
                    // This case should be virtually impossible if the insert works, but it's a good safeguard.
                    throw new Error("Failed to create or find the category after insertion.");
                }

                // Return 200 OK since we are returning a category, whether it was just created or already existed.
                return res.status(200).json(category);
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
                    // Handle update
                    rows = await sql`UPDATE suppliers SET name = ${supplier.name}, email = ${supplier.email || null}, phone = ${supplier.phone || null} WHERE id = ${supplier.id} RETURNING *;`;
                } else {
                    // Handle insert or update on conflict (upsert) to prevent race conditions.
                    rows = await sql`
                        INSERT INTO suppliers (id, name, email, phone) 
                        VALUES (${randomUUID()}, ${supplier.name}, ${supplier.email || null}, ${supplier.phone || null}) 
                        ON CONFLICT (name) 
                        DO UPDATE SET email = EXCLUDED.email, phone = EXCLUDED.phone 
                        RETURNING *;
                    `;
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
                
                const queries = [
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
                        const newStatus = newQuantity > 0 ? ProductStatus.Available : ProductStatus.Sold;
                        queries.push(sql`UPDATE products SET quantity = ${newQuantity}, status = ${newStatus}, "invoiceId" = ${newInvoiceId}, "customerName" = ${newStatus === ProductStatus.Sold ? customer.name : null} WHERE id = ${product.id};`);
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
                const productsToInsert: Product[] = [];
                const newPoId = randomUUID();

                for (const batch of productsData) {
                    const commonData = { ...batch.productInfo, status: ProductStatus.Available, purchaseOrderId: newPoId };
                    if (batch.details.trackingType === 'imei') {
                        for (const imei of batch.details.imeis) {
                            const newProduct: Product = { ...commonData, id: randomUUID(), imei, quantity: 1, trackingType: 'imei' as const, customerName: undefined };
                            productsToInsert.push(newProduct);
                            totalCost += commonData.purchasePrice;
                        }
                    } else {
                        const newProduct: Product = { ...commonData, id: randomUUID(), imei: undefined, quantity: batch.details.quantity, trackingType: 'quantity' as const, customerName: undefined };
                        productsToInsert.push(newProduct);
                        totalCost += commonData.purchasePrice * batch.details.quantity;
                    }
                }
                const queries = [
                    sql`INSERT INTO purchase_orders (id, "poNumber", "supplierId", "issueDate", "totalCost", status, notes) VALUES (${newPoId}, ${poDetails.poNumber}, ${poDetails.supplierId}, ${new Date().toISOString()}, ${totalCost}, ${poDetails.status}, ${poDetails.notes || null})`
                ];
                for (const p of productsToInsert) {
                    queries.push(sql`INSERT INTO products (id, "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity) VALUES (${p.id}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, ${p.status}, ${p.notes}, ${p.purchaseOrderId}, ${p.trackingType}, ${p.imei || null}, ${p.quantity})`);
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

async function handleGenerateInsights(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        if (!process.env.API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Gemini API key is missing.' });
        }

        const { products, invoices } = req.body;

        if (!products || !invoices) {
            return res.status(400).json({ error: 'Bad Request: Missing products or invoices data.' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const availableProducts = products.filter((p: Product) => p.status === ProductStatus.Available);
        const soldProducts = products.filter((p: Product) => p.status === ProductStatus.Sold);
        
        const totalStock = availableProducts.reduce((sum: number, p: Product) => sum + p.quantity, 0);
        const totalInventoryValue = availableProducts.reduce((sum: number, p: Product) => sum + (p.purchasePrice * p.quantity), 0);
        const totalSalesValue = invoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0);
        
        const prompt = `
            You are an expert business analyst for an electronics resale shop.
            Analyze the following inventory and sales data and provide a concise summary with actionable insights.
            Format your response using Markdown with headings, bold text, and bullet points.

            Current Data Snapshot:
            - Total Active Stock Units: ${totalStock}
            - Total Inventory Value (Cost): ${totalInventoryValue.toFixed(2)} EUR
            - Total Sales Value (Last ${invoices.length} invoices): ${totalSalesValue.toFixed(2)} EUR
            - Number of Invoices: ${invoices.length}

            Product Details (sample of available products):
            ${availableProducts.slice(0, 10).map((p: Product) => `- ${p.productName} (Sell: ${p.sellingPrice} EUR, Stock: ${p.quantity})`).join('\n')}

            Recent Sales (sample of sold items):
            ${soldProducts.slice(0, 10).map((p: Product) => `- ${p.productName} (Sold for: ${p.sellingPrice} EUR)`).join('\n')}

            Based on this data, provide:
            1.  A brief "### Business Performance Summary".
            2.  A section on "### Opportunities & Observations" highlighting top performers or slow-moving stock.
            3.  A section with 2-3 "### Actionable Recommendations" for the business owner (e.g., promotions, restocking advice, pricing adjustments).
            
            Keep the tone professional, encouraging, and data-driven.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        
        return res.status(200).json({ insights: text });

    } catch (error: any) {
        console.error('Error generating AI insights:', error);
        return res.status(500).json({ error: 'Failed to generate insights from AI model.', details: error.message });
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
    try {
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL environment variable is not set.');
            return res.status(500).json({ error: 'Server configuration error: Database connection string is missing.' });
        }
        const sql = postgres(process.env.DATABASE_URL, {
          ssl: 'require',
        });
        
        // Vercel's rewrite gives us the original path in x-rewritten-path
        const path = (req.headers['x-rewritten-path'] as string) || req.url!;
        const endpoint = path.split('/')[2]?.split('?')[0] || '';

        switch (endpoint) {
            case 'products':
                return await handleProducts(req, res, sql);
            case 'customers':
                return await handleCustomers(req, res, sql);
            case 'categories':
                return await handleCategories(req, res, sql);
            case 'suppliers':
                return await handleSuppliers(req, res, sql);
            case 'invoices':
                return await handleInvoices(req, res, sql);
            case 'purchase-orders':
                return await handlePurchaseOrders(req, res, sql);
            case 'generate-insights':
                return await handleGenerateInsights(req, res);
            case 'setup':
                return await handleDbSetup(req, res, sql);
            default:
                return res.status(404).json({ error: 'Endpoint not found' });
        }
    } catch (error) {
        // This is a top-level catch for unexpected errors (e.g., if neon() fails)
        console.error('An unexpected error occurred in the main handler:', error);
        return res.status(500).json({ error: 'An unexpected server error occurred.', details: (error as Error).message });
    }
}