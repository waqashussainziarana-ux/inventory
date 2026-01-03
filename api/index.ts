
import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';

// --- DATABASE CONNECTION ---
let sql: postgres.Sql;

function getDbConnection() {
    if (!sql) {
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL is not configured. Please add your connection string to Vercel environment variables.');
        }
        sql = postgres(connectionString, {
            ssl: 'require',
            max: 10,
            idle_timeout: 5,
            connect_timeout: 15,
            prepare: false,
        });
    }
    return sql;
}

// --- HELPERS ---
function getUserId(req: VercelRequest): string | null {
    const userId = req.headers['x-user-id'];
    return Array.isArray(userId) ? userId[0] : (userId as string) || null;
}

function handleError(res: VercelResponse, error: any, resourceName: string) {
    console.error(`[API ERROR] ${resourceName}:`, error.message);
    return res.status(500).json({ 
        error: `Server Error: ${resourceName}`, 
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
    });
}

const sanitize = (row: any) => {
    if (!row) return row;
    const result = { ...row };
    const numericFields = ['purchasePrice', 'sellingPrice', 'totalAmount', 'totalCost', 'quantity'];
    numericFields.forEach(field => {
        if (result[field] !== undefined && result[field] !== null) {
            result[field] = Number(result[field]);
        }
    });
    return result;
};

async function ensureTables(db: postgres.Sql) {
    try {
        await db`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, name VARCHAR(255));`;
        await db`CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), UNIQUE(name, "userId"));`;
        await db`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, UNIQUE(name, "userId"));`;
        await db`CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, UNIQUE(name, "userId"));`;
        await db`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "invoiceNumber" VARCHAR(255) NOT NULL, "customerId" UUID REFERENCES customers(id), "customerName" VARCHAR(255), "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(), "totalAmount" NUMERIC(10, 2) NOT NULL);`;
        await db`CREATE TABLE IF NOT EXISTS invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE, "productId" UUID, "productName" VARCHAR(255) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL);`;
        await db`CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "poNumber" VARCHAR(255) NOT NULL, "supplierId" UUID REFERENCES suppliers(id), "supplierName" VARCHAR(255), "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(), "totalCost" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT);`;
        await db`CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "productName" VARCHAR(255) NOT NULL, category VARCHAR(255), "purchaseDate" DATE NOT NULL, "purchasePrice" NUMERIC(10, 2) NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT, "invoiceId" UUID, "purchaseOrderId" UUID, "trackingType" VARCHAR(50) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "customerName" VARCHAR(255));`;
    } catch (e) {
        console.warn("Table initialization check completed.");
    }
}

async function handleSimpleResource(req: VercelRequest, res: VercelResponse, db: postgres.Sql, userId: string, tableName: string) {
    try {
        if (req.method === 'GET') {
            const rows = await db`SELECT * FROM ${db(tableName)} WHERE "userId" = ${userId} ORDER BY name ASC`;
            return res.status(200).json(rows.map(sanitize));
        }
        if (req.method === 'POST') {
            const id = randomUUID();
            const dataToInsert = { ...req.body, id, "userId": userId };
            const result = await db`
                INSERT INTO ${db(tableName)} ${db(dataToInsert)}
                ON CONFLICT (name, "userId") DO UPDATE SET name = EXCLUDED.name
                RETURNING *;
            `;
            return res.status(200).json(sanitize(result[0]));
        }
        if (req.method === 'DELETE') {
            await db`DELETE FROM ${db(tableName)} WHERE id = ${req.body.id} AND "userId" = ${userId}`;
            return res.status(200).json({ success: true });
        }
    } catch (e) { return handleError(res, e, tableName); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const db = getDbConnection();
        await ensureTables(db);

        // Standardize URL parsing
        const fullUrl = req.url || '';
        const cleanPath = fullUrl.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '');
        const parts = cleanPath.split('/');
        const resource = parts[0];

        // 1. PUBLIC ROUTES
        if (resource === 'auth') {
            const endpoint = parts[1];
            if (endpoint === 'signup') {
                const { email, password, name } = req.body;
                const result = await db`INSERT INTO users (id, email, password, name) VALUES (${randomUUID()}, ${email}, ${password}, ${name}) RETURNING id, email, name;`;
                return res.status(201).json({ user: sanitize(result[0]) });
            } 
            if (endpoint === 'login') {
                const { email, password } = req.body;
                const result = await db`SELECT id, email, name FROM users WHERE email = ${email} AND password = ${password}`;
                if (result.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });
                return res.status(200).json({ user: sanitize(result[0]) });
            }
            return res.status(404).json({ error: 'Auth endpoint not found' });
        }

        // 2. PROTECTED ROUTES - Check for userId
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing User ID. Please log in again.' });
        }

        switch (resource) {
            case 'categories':
            case 'customers':
            case 'suppliers':
                return await handleSimpleResource(req, res, db, userId, resource);
            
            case 'products':
                if (req.method === 'GET') {
                    const products = await db`SELECT * FROM products WHERE "userId" = ${userId} ORDER BY "purchaseDate" DESC`;
                    return res.status(200).json(products.map(sanitize));
                }
                if (req.method === 'POST' || req.method === 'PUT') {
                    const { id, ...body } = req.body;
                    const finalId = id || randomUUID();
                    const data = { ...body, id: finalId, "userId": userId };
                    const result = req.method === 'POST' 
                        ? await db`INSERT INTO products ${db(data)} RETURNING *`
                        : await db`UPDATE products SET ${db(body)} WHERE id = ${id} AND "userId" = ${userId} RETURNING *`;
                    return res.status(200).json(sanitize(result[0]));
                }
                if (req.method === 'DELETE') {
                    await db`DELETE FROM products WHERE id = ${req.body.id} AND "userId" = ${userId}`;
                    return res.status(200).json({ success: true });
                }
                break;

            case 'invoices':
                if (req.method === 'GET') {
                    const invoices = await db`SELECT * FROM invoices WHERE "userId" = ${userId} ORDER BY "issueDate" DESC`;
                    const items = await db`SELECT * FROM invoice_items WHERE "invoiceId" IN (SELECT id FROM invoices WHERE "userId" = ${userId})`;
                    return res.status(200).json(invoices.map(inv => ({ 
                        ...sanitize(inv), 
                        items: items.filter(it => it.invoiceId === inv.id).map(sanitize) 
                    })));
                }
                if (req.method === 'POST') {
                    const { customerId, items } = req.body;
                    const newInvId = randomUUID();
                    
                    // Fetch customer name for historical record in invoice
                    const [customer] = await db`SELECT name FROM customers WHERE id = ${customerId} AND "userId" = ${userId}`;
                    const customerDisplayName = customer?.name || 'Walk-in';

                    await db.begin(async (sql) => {
                        const total = items.reduce((s: number, i: any) => s + (Number(i.sellingPrice) * Number(i.quantity)), 0);
                        
                        // 1. Create Invoice
                        await sql`INSERT INTO invoices (id, "userId", "invoiceNumber", "customerId", "customerName", "totalAmount") 
                                  VALUES (${newInvId}, ${userId}, ${'INV-'+Date.now()}, ${customerId || null}, ${customerDisplayName}, ${total})`;
                        
                        for (const it of items) {
                            // 2. Record individual items sold
                            await sql`INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice") 
                                      VALUES (${newInvId}, ${it.productId}, ${it.productName}, ${it.imei || null}, ${it.quantity}, ${it.sellingPrice})`;
                            
                            // 3. Update Inventory Logic
                            const [prod] = await sql`SELECT * FROM products WHERE id = ${it.productId} AND "userId" = ${userId}`;
                            if (prod) {
                                if (prod.trackingType === 'imei') {
                                    // Unique item sold: mark existing record as Sold
                                    await sql`UPDATE products SET status = 'Sold', "invoiceId" = ${newInvId}, "customerName" = ${customerDisplayName} 
                                              WHERE id = ${it.productId}`;
                                } else {
                                    // Bulk item sold: split quantity
                                    const sellQty = Number(it.quantity);
                                    const availQty = Number(prod.quantity);
                                    
                                    if (sellQty >= availQty) {
                                        // Selling everything: mark entire record as Sold
                                        await sql`UPDATE products SET status = 'Sold', "invoiceId" = ${newInvId}, "customerName" = ${customerDisplayName}, quantity = ${availQty} 
                                                  WHERE id = ${it.productId}`;
                                    } else {
                                        // Selling part: reduce stock and create a Sold "clone" for history
                                        await sql`UPDATE products SET quantity = ${availQty - sellQty} WHERE id = ${it.productId}`;
                                        
                                        const soldProdId = randomUUID();
                                        // Exclude ID to let us create a new one
                                        const { id, quantity, status, invoiceId, customerName, ...rest } = prod;
                                        await sql`INSERT INTO products ${sql({
                                            ...rest,
                                            id: soldProdId,
                                            quantity: sellQty,
                                            status: 'Sold',
                                            invoiceId: newInvId,
                                            customerName: customerDisplayName
                                        })}`;
                                    }
                                }
                            }
                        }
                    });
                    return res.status(201).json({ id: newInvId });
                }
                break;

            case 'purchase-orders':
                if (req.method === 'GET') {
                    const pos = await db`SELECT * FROM purchase_orders WHERE "userId" = ${userId} ORDER BY "issueDate" DESC`;
                    return res.status(200).json(pos.map(sanitize));
                }
                if (req.method === 'POST') {
                    const { poDetails, productsData } = req.body;
                    const newPoId = randomUUID();
                    const [supplier] = await db`SELECT name FROM suppliers WHERE id = ${poDetails.supplierId} AND "userId" = ${userId}`;
                    await db.begin(async (sql) => {
                        await sql`INSERT INTO purchase_orders (id, "userId", "poNumber", "supplierId", "supplierName", "totalCost", status) VALUES (${newPoId}, ${userId}, ${poDetails.poNumber}, ${poDetails.supplierId}, ${supplier?.name}, ${poDetails.totalCost || 0}, ${poDetails.status})`;
                        for (const batch of productsData) {
                            const { productInfo, details } = batch;
                            const itemsToAdd = details.trackingType === 'imei' 
                                ? details.imeis.map((imei: string) => ({ ...productInfo, imei, trackingType: 'imei', quantity: 1, "purchaseOrderId": newPoId, "userId": userId, status: 'Available', id: randomUUID() }))
                                : [{ ...productInfo, trackingType: 'quantity', quantity: details.quantity, "purchaseOrderId": newPoId, "userId": userId, status: 'Available', id: randomUUID() }];
                            for (const p of itemsToAdd) { await sql`INSERT INTO products ${db(p)}`; }
                        }
                    });
                    return res.status(201).json({ id: newPoId });
                }
                break;
            
            case 'generate-insights':
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `Review inventory: ${JSON.stringify(req.body.products.slice(0, 10))}. Suggest 3 strategies.`;
                    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                    return res.status(200).json({ insights: response.text });
                } catch (e: any) {
                    return res.status(500).json({ error: "Insight failed", details: e.message });
                }

            default:
                return res.status(404).json({ error: `Not found: ${resource}` });
        }
    } catch (e: any) {
        return handleError(res, e, 'global_handler');
    }
}
