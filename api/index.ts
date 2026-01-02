
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
            throw new Error('DATABASE_URL or POSTGRES_URL is not configured in Vercel environment variables. Please check your Vercel project settings.');
        }
        sql = postgres(connectionString, {
            ssl: 'require',
            max: 10,
            idle_timeout: 5,
            connect_timeout: 10,
            prepare: false,
        });
    }
    return sql;
}

// --- HELPERS ---
function getUserId(req: VercelRequest): string | null {
    return (req.headers['x-user-id'] as string) || null;
}

function handleError(res: VercelResponse, error: any, resourceName: string) {
    console.error(`[API ERROR] Resource: ${resourceName} | Message: ${error.message}`);
    return res.status(500).json({ 
        error: `Database Error in ${resourceName}`, 
        details: error.message,
        code: error.code
    });
}

async function ensureTables(db: postgres.Sql) {
    try {
        const tableExists = await db`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `;

        if (!tableExists[0].exists) {
            console.log("Initializing database tables...");
            await db.begin(async (sql) => {
                await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, name VARCHAR(255));`;
                await sql`CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), UNIQUE(name, "userId"));`;
                await sql`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, UNIQUE(name, "userId"));`;
                await sql`CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, UNIQUE(name, "userId"));`;
                await sql`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "invoiceNumber" VARCHAR(255) NOT NULL, "customerId" UUID REFERENCES customers(id), "customerName" VARCHAR(255), "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(), "totalAmount" NUMERIC(10, 2) NOT NULL);`;
                await sql`CREATE TABLE IF NOT EXISTS invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE, "productId" UUID, "productName" VARCHAR(255) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL);`;
                await sql`CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "poNumber" VARCHAR(255) NOT NULL, "supplierId" UUID REFERENCES suppliers(id), "supplierName" VARCHAR(255), "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(), "totalCost" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT);`;
                await sql`CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "productName" VARCHAR(255) NOT NULL, category VARCHAR(255), "purchaseDate" DATE NOT NULL, "purchasePrice" NUMERIC(10, 2) NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT, "invoiceId" UUID, "purchaseOrderId" UUID, "trackingType" VARCHAR(50) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "customerName" VARCHAR(255));`;
            });
        }
    } catch (e) {
        console.error("Critical error in ensureTables:", e);
    }
}

async function handleSimpleResource(req: VercelRequest, res: VercelResponse, db: postgres.Sql, userId: string, tableName: string) {
    try {
        const table = db(tableName);
        if (req.method === 'GET') {
            const rows = await db`SELECT * FROM ${table} WHERE "userId" = ${userId} ORDER BY name ASC`;
            return res.status(200).json(rows);
        }
        if (req.method === 'POST') {
            const id = randomUUID();
            const dataToInsert = { ...req.body, id, userId };
            
            // Using the postgres object insertion helper: sql`INSERT INTO table ${ sql(data) }`
            const result = await db`
                INSERT INTO ${table} ${db(dataToInsert)}
                ON CONFLICT (name, "userId") DO UPDATE SET name = EXCLUDED.name
                RETURNING *;
            `;
            return res.status(200).json(result[0]);
        }
        if (req.method === 'DELETE') {
            await db`DELETE FROM ${table} WHERE id = ${req.body.id} AND "userId" = ${userId}`;
            return res.status(200).json({ success: true });
        }
    } catch (e) { return handleError(res, e, tableName); }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const db = getDbConnection();
    await ensureTables(db);

    const path = req.url?.split('/') || [];
    const resource = path[2];

    if (resource === 'auth') {
        const endpoint = path[3];
        try {
            if (endpoint === 'signup') {
                const { email, password, name } = req.body;
                const id = randomUUID();
                const result = await db`
                    INSERT INTO users (id, email, password, name)
                    VALUES (${id}, ${email}, ${password}, ${name})
                    RETURNING id, email, name;
                `;
                return res.status(201).json({ user: result[0] });
            } 
            if (endpoint === 'login') {
                const { email, password } = req.body;
                const result = await db`
                    SELECT id, email, name FROM users 
                    WHERE email = ${email} AND password = ${password}
                `;
                if (result.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });
                return res.status(200).json({ user: result[0] });
            }
        } catch (e: any) {
            if (e.code === '23505') return res.status(400).json({ error: 'Email already registered.' });
            return handleError(res, e, 'auth');
        }
    }

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Session expired. Please log in again.' });

    switch (resource) {
        case 'categories':
        case 'customers':
        case 'suppliers':
            return await handleSimpleResource(req, res, db, userId, resource);
        
        case 'products':
            if (req.method === 'GET') return res.status(200).json(await db`SELECT * FROM products WHERE "userId" = ${userId} ORDER BY "purchaseDate" DESC`);
            if (req.method === 'POST') {
                const id = randomUUID();
                const result = await db`INSERT INTO products (id, "userId", ${db(Object.keys(req.body))}) VALUES (${id}, ${userId}, ${Object.values(req.body)}) RETURNING *`;
                return res.status(201).json(result[0]);
            }
            if (req.method === 'PUT') {
                const { id, ...data } = req.body;
                const result = await db`UPDATE products SET ${db(data)} WHERE id = ${id} AND "userId" = ${userId} RETURNING *`;
                return res.status(200).json(result[0]);
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
                return res.status(200).json(invoices.map(inv => ({ ...inv, items: items.filter(it => it.invoiceId === inv.id) })));
            }
            if (req.method === 'POST') {
                const { customerId, items } = req.body;
                const newInvId = randomUUID();
                const [customer] = await db`SELECT name FROM customers WHERE id = ${customerId} AND "userId" = ${userId}`;
                await db.begin(async (sql) => {
                    const total = items.reduce((s: number, i: any) => s + (Number(i.sellingPrice) * Number(i.quantity)), 0);
                    await sql`INSERT INTO invoices (id, "userId", "invoiceNumber", "customerId", "customerName", "totalAmount") VALUES (${newInvId}, ${userId}, ${'INV-'+Date.now()}, ${customerId}, ${customer?.name || 'Walk-in'}, ${total})`;
                    for (const it of items) {
                        await sql`INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice") VALUES (${newInvId}, ${it.productId}, ${it.productName}, ${it.imei || null}, ${it.quantity}, ${it.sellingPrice})`;
                        await sql`UPDATE products SET status = 'Sold', "invoiceId" = ${newInvId}, "customerName" = ${customer?.name || 'Walk-in'} WHERE id = ${it.productId} AND "userId" = ${userId}`;
                    }
                });
                return res.status(201).json({ id: newInvId });
            }
            break;

        case 'purchase-orders':
            if (req.method === 'GET') return res.status(200).json(await db`SELECT * FROM purchase_orders WHERE "userId" = ${userId} ORDER BY "issueDate" DESC`);
            if (req.method === 'POST') {
                const { poDetails, productsData } = req.body;
                const newPoId = randomUUID();
                const [supplier] = await db`SELECT name FROM suppliers WHERE id = ${poDetails.supplierId} AND "userId" = ${userId}`;
                
                await db.begin(async (sql) => {
                    await sql`INSERT INTO purchase_orders (id, "userId", "poNumber", "supplierId", "supplierName", "totalCost", status) VALUES (${newPoId}, ${userId}, ${poDetails.poNumber}, ${poDetails.supplierId}, ${supplier?.name}, ${poDetails.totalCost || 0}, ${poDetails.status})`;
                    for (const batch of productsData) {
                        const { productInfo, details } = batch;
                        const qty = details.trackingType === 'imei' ? details.imeis.length : details.quantity;
                        const itemsToAdd = details.trackingType === 'imei' 
                            ? details.imeis.map((imei: string) => ({ ...productInfo, imei, trackingType: 'imei', quantity: 1 }))
                            : [{ ...productInfo, trackingType: 'quantity', quantity: qty }];

                        for (const p of itemsToAdd) {
                            await sql`INSERT INTO products (id, "userId", "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, "purchaseOrderId", "trackingType", imei, quantity)
                                      VALUES (${randomUUID()}, ${userId}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, 'Available', ${newPoId}, ${p.trackingType}, ${p.imei || null}, ${p.quantity})`;
                        }
                    }
                });
                return res.status(201).json({ id: newPoId });
            }
            break;
            
        case 'generate-insights':
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const dataStr = JSON.stringify({ products: req.body.products.slice(0, 30), invoices: req.body.invoices.slice(0, 10) });
                const prompt = `Analyze inventory and sales data for a business tracking IMEIs. Products: ${dataStr}. Provide 3 strategic tips for stock levels and pricing. Use professional Markdown.`;
                const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
                return res.status(200).json({ insights: response.text });
            } catch (aiErr: any) {
                return res.status(500).json({ error: "AI Insight generation failed", details: aiErr.message });
            }

        default:
            return res.status(404).json({ error: 'Endpoint not found' });
    }
}
