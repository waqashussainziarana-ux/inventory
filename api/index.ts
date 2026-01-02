
import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import { Product, ProductStatus, Invoice, InvoiceItem, Customer, Supplier, NewProduct, NewProductInfo, PurchaseOrderStatus } from '../types';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';

// --- DATABASE CONNECTION ---
let sql: postgres.Sql;

function getDbConnection() {
    if (!sql) {
        if (!process.env.DATABASE_URL) {
            throw new Error('Server configuration error: DATABASE_URL environment variable is not set.');
        }
        sql = postgres(process.env.DATABASE_URL, {
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
    console.error(`Database Error [${resourceName}]:`, error);
    return res.status(500).json({ 
        error: `Internal Server Error: ${resourceName}`, 
        details: error.message,
        code: error.code
    });
}

// --- AUTH HANDLERS ---

async function handleAuth(req: VercelRequest, res: VercelResponse, db: postgres.Sql) {
    const endpoint = req.url?.split('/')[3]; // /api/auth/[endpoint]
    
    try {
        if (endpoint === 'signup') {
            const { email, password, name } = req.body;
            const id = randomUUID();
            const [user] = await db`
                INSERT INTO users (id, email, password, name)
                VALUES (${id}, ${email}, ${password}, ${name})
                RETURNING id, email, name;
            `;
            return res.status(201).json({ user });
        } 
        
        if (endpoint === 'login') {
            const { email, password } = req.body;
            const [user] = await db`
                SELECT id, email, name FROM users 
                WHERE email = ${email} AND password = ${password}
            `;
            if (!user) return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
            return res.status(200).json({ user });
        }
        
        return res.status(404).json({ error: 'Auth endpoint not found' });
    } catch (e: any) {
        if (e.code === '23505') return res.status(400).json({ error: 'This email is already registered.' });
        return handleError(res, e, 'auth');
    }
}

// --- DATA HANDLERS (USER SCOPED) ---

async function handleGenerateInsights(req: VercelRequest, res: VercelResponse, userId: string) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { products, invoices } = req.body;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
        You are a business consultant for an inventory and sales tracking app. 
        Analyze the following data for user ID ${userId} and provide actionable business insights, 
        performance summaries, and stock recommendations.
        
        Products Data (truncated): ${JSON.stringify(products).substring(0, 10000)}
        Invoices Data (truncated): ${JSON.stringify(invoices).substring(0, 5000)}
        
        Format your response in professional Markdown with sections for:
        1. Executive Summary
        2. Sales Performance
        3. Inventory Health (Stock levels, high/low demand)
        4. Financial Health (Profit, Costs)
        5. Recommendations
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        return res.status(200).json({ insights: response.text });
    } catch (e: any) {
        return handleError(res, e, 'ai-insights');
    }
}

async function handleProducts(req: VercelRequest, res: VercelResponse, db: postgres.Sql, userId: string) {
    try {
        switch (req.method) {
            case 'GET': {
                const rows = await db`SELECT * FROM products WHERE "userId" = ${userId} ORDER BY "purchaseDate" DESC`;
                return res.status(200).json(rows);
            }
            case 'POST': {
                const newProducts: any[] = Array.isArray(req.body) ? req.body : [req.body];
                const productsWithIds = newProducts.map(p => ({ ...p, id: randomUUID(), userId }));
                const results = await db.begin(async (sql) => {
                    const queries = productsWithIds.map(p => sql`
                        INSERT INTO products (id, "userId", "productName", category, "purchaseDate", "purchasePrice", "sellingPrice", status, notes, "purchaseOrderId", "trackingType", imei, quantity, "customerName")
                        VALUES (${p.id}, ${p.userId}, ${p.productName}, ${p.category}, ${p.purchaseDate}, ${p.purchasePrice}, ${p.sellingPrice}, ${p.status}, ${p.notes || null}, ${p.purchaseOrderId || null}, ${p.trackingType}, ${p.imei || null}, ${p.quantity}, ${p.customerName || null})
                        RETURNING *;
                    `);
                    return await Promise.all(queries);
                });
                return res.status(201).json(results.map(r => r[0]));
            }
            case 'PUT': {
                const p = req.body;
                const [row] = await db`
                    UPDATE products SET 
                        "productName" = ${p.productName}, category = ${p.category}, "purchaseDate" = ${p.purchaseDate}, 
                        "purchasePrice" = ${p.purchasePrice}, "sellingPrice" = ${p.sellingPrice}, status = ${p.status}, 
                        notes = ${p.notes || null}, "invoiceId" = ${p.invoiceId || null}, "customerName" = ${p.customerName || null}
                    WHERE id = ${p.id} AND "userId" = ${userId}
                    RETURNING *;
                `;
                return res.status(200).json(row || { error: 'Not found' });
            }
            case 'DELETE': {
                await db`DELETE FROM products WHERE id = ${req.body.id} AND "userId" = ${userId}`;
                return res.status(200).json({ success: true });
            }
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (e) { return handleError(res, e, 'products'); }
}

async function handleInvoices(req: VercelRequest, res: VercelResponse, db: postgres.Sql, userId: string) {
    try {
        if (req.method === 'GET') {
            const invoices = await db`SELECT * FROM invoices WHERE "userId" = ${userId} ORDER BY "issueDate" DESC`;
            const items = await db`SELECT * FROM invoice_items WHERE "invoiceId" IN (SELECT id FROM invoices WHERE "userId" = ${userId})`;
            return res.status(200).json(invoices.map(inv => ({
                ...inv,
                items: items.filter(it => it.invoiceId === inv.id)
            })));
        }
        if (req.method === 'POST') {
            const { customerId, items } = req.body;
            const newInvoiceId = randomUUID();
            const [customer] = await db`SELECT name FROM customers WHERE id = ${customerId} AND "userId" = ${userId}`;
            
            await db.begin(async (sql) => {
                const total = items.reduce((sum: number, it: any) => sum + it.sellingPrice * it.quantity, 0);
                await sql`INSERT INTO invoices (id, "userId", "invoiceNumber", "customerId", "issueDate", "totalAmount") VALUES (${newInvoiceId}, ${userId}, ${'INV-' + Date.now()}, ${customerId}, ${new Date().toISOString()}, ${total})`;
                for (const item of items) {
                    await sql`INSERT INTO invoice_items ("invoiceId", "productId", "productName", imei, quantity, "sellingPrice") VALUES (${newInvoiceId}, ${item.productId}, ${item.productName || 'Product'}, ${item.imei || null}, ${item.quantity}, ${item.sellingPrice})`;
                    await sql`UPDATE products SET status = 'Sold', "invoiceId" = ${newInvoiceId}, "customerName" = ${customer?.name || 'Walk-in Customer'} WHERE id = ${item.productId} AND "userId" = ${userId}`;
                }
            });
            const [final] = await db`SELECT * FROM invoices WHERE id = ${newInvoiceId}`;
            return res.status(201).json(final);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) { return handleError(res, e, 'invoices'); }
}

async function handleSimpleResource(req: VercelRequest, res: VercelResponse, db: postgres.Sql, userId: string, tableName: string) {
    try {
        const table = db(tableName);
        switch (req.method) {
            case 'GET': {
                const rows = await db`SELECT * FROM ${table} WHERE "userId" = ${userId} ORDER BY name ASC`;
                return res.status(200).json(rows);
            }
            case 'POST': {
                const { name, ...rest } = req.body;
                const columns = Object.keys(rest);
                const values = Object.values(rest);
                
                let row;
                if (columns.length > 0) {
                    [row] = await db`
                        INSERT INTO ${table} (id, "userId", name, ${db(columns)})
                        VALUES (${randomUUID()}, ${userId}, ${name}, ${values})
                        ON CONFLICT (name, "userId") DO UPDATE SET name = EXCLUDED.name
                        RETURNING *;
                    `;
                } else {
                    [row] = await db`
                        INSERT INTO ${table} (id, "userId", name)
                        VALUES (${randomUUID()}, ${userId}, ${name})
                        ON CONFLICT (name, "userId") DO UPDATE SET name = EXCLUDED.name
                        RETURNING *;
                    `;
                }
                return res.status(200).json(row);
            }
            case 'DELETE': {
                const { id } = req.body;
                await db`DELETE FROM ${table} WHERE id = ${id} AND "userId" = ${userId}`;
                return res.status(200).json({ success: true });
            }
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (e) { return handleError(res, e, tableName); }
}

async function handleSetup(res: VercelResponse, db: postgres.Sql) {
    try {
        await db.begin(async (sql) => {
            // USERS
            await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password TEXT NOT NULL, name VARCHAR(255));`;
            
            // SUPPLIERS
            await sql`CREATE TABLE IF NOT EXISTS suppliers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), UNIQUE(name, "userId"));`;
            
            // CUSTOMERS
            await sql`CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, UNIQUE(name, "userId"));`;
            
            // CATEGORIES
            await sql`CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), name VARCHAR(255) NOT NULL, UNIQUE(name, "userId"));`;
            
            // INVOICES
            await sql`CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "invoiceNumber" VARCHAR(255) NOT NULL, "customerId" UUID REFERENCES customers(id), "issueDate" DATE NOT NULL, "totalAmount" NUMERIC(10, 2) NOT NULL);`;
            
            // PURCHASE ORDERS
            await sql`CREATE TABLE IF NOT EXISTS purchase_orders (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "poNumber" VARCHAR(255) NOT NULL, "supplierId" UUID REFERENCES suppliers(id), "issueDate" DATE NOT NULL, "totalCost" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT);`;
            
            // PRODUCTS
            await sql`CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY, "userId" UUID REFERENCES users(id), "productName" VARCHAR(255) NOT NULL, category VARCHAR(255), "purchaseDate" DATE NOT NULL, "purchasePrice" NUMERIC(10, 2) NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL, status VARCHAR(50) NOT NULL, notes TEXT, "invoiceId" VARCHAR(255), "purchaseOrderId" VARCHAR(255), "trackingType" VARCHAR(50) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "customerName" VARCHAR(255));`;
            
            // INVOICE ITEMS
            await sql`CREATE TABLE IF NOT EXISTS invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE, "productId" UUID, "productName" VARCHAR(255) NOT NULL, imei VARCHAR(255), quantity INTEGER NOT NULL, "sellingPrice" NUMERIC(10, 2) NOT NULL);`;
        });
        return res.status(200).json({ message: 'Database initialized successfully. You can now sign up.' });
    } catch (e) { return handleError(res, e, 'setup'); }
}

// --- MAIN ROUTER ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const db = getDbConnection();
    const userId = getUserId(req);
    const path = req.url?.split('/') || [];
    const resource = path[2];

    // Public resources
    if (resource === 'auth') return await handleAuth(req, res, db);
    if (resource === 'setup') return await handleSetup(res, db);
    if (resource === 'db-status') return res.status(200).json({ status: 'ok' });

    // Protected resources
    if (!userId) return res.status(401).json({ error: 'Authentication required. Please log in.' });

    switch (resource) {
        case 'generate-insights': return await handleGenerateInsights(req, res, userId);
        case 'products': return await handleProducts(req, res, db, userId);
        case 'customers': return await handleSimpleResource(req, res, db, userId, 'customers');
        case 'categories': return await handleSimpleResource(req, res, db, userId, 'categories');
        case 'suppliers': return await handleSimpleResource(req, res, db, userId, 'suppliers');
        case 'invoices': return await handleInvoices(req, res, db, userId);
        case 'purchase-orders': 
            if (req.method === 'GET') {
                const rows = await db`SELECT * FROM purchase_orders WHERE "userId" = ${userId} ORDER BY "issueDate" DESC`;
                return res.status(200).json(rows);
            }
            return res.status(405).json({ error: 'Method not allowed' });
        default:
            return res.status(404).json({ error: 'Endpoint not found' });
    }
}
