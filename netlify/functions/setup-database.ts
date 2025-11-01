import type { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const sql = neon();

  try {
    await sql.transaction([
      sql`
        CREATE TABLE IF NOT EXISTS suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255),
          phone VARCHAR(50)
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS purchase_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "poNumber" VARCHAR(255) NOT NULL UNIQUE,
          "supplierId" UUID REFERENCES suppliers(id),
          "issueDate" DATE NOT NULL,
          "totalCost" NUMERIC(10, 2) NOT NULL,
          status VARCHAR(50) NOT NULL,
          notes TEXT
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "invoiceNumber" VARCHAR(255) NOT NULL UNIQUE,
          "customerId" UUID REFERENCES customers(id),
          "issueDate" DATE NOT NULL,
          "totalAmount" NUMERIC(10, 2) NOT NULL
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "productName" VARCHAR(255) NOT NULL,
          category VARCHAR(255),
          "purchaseDate" DATE NOT NULL,
          "purchasePrice" NUMERIC(10, 2) NOT NULL,
          "sellingPrice" NUMERIC(10, 2) NOT NULL,
          status VARCHAR(50) NOT NULL,
          notes TEXT,
          "invoiceId" VARCHAR(255),
          "purchaseOrderId" VARCHAR(255),
          "trackingType" VARCHAR(50) NOT NULL,
          imei VARCHAR(255) UNIQUE,
          quantity INTEGER NOT NULL,
          "customerName" VARCHAR(255)
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS invoice_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE,
            "productId" UUID, 
            "productName" VARCHAR(255) NOT NULL,
            imei VARCHAR(255),
            quantity INTEGER NOT NULL,
            "sellingPrice" NUMERIC(10, 2) NOT NULL
        );
      `,
    ]);

    // Seed initial data if tables are empty
    const [categoryCount] = await sql`SELECT COUNT(*) FROM categories`;
    if (Number(categoryCount.count) === 0) {
      await sql`
        INSERT INTO categories (name) VALUES 
        ('Smartphones'), ('Laptops'), ('Accessories'), ('Tablets');
      `;
    }

    const [customerCount] = await sql`SELECT COUNT(*) FROM customers`;
    if (Number(customerCount.count) === 0) {
      await sql`
        INSERT INTO customers (name, phone) VALUES 
        ('Walk-in Customer', 'N/A');
      `;
    }

    const [supplierCount] = await sql`SELECT COUNT(*) FROM suppliers`;
    if (Number(supplierCount.count) === 0) {
      await sql`
        INSERT INTO suppliers (name, email, phone) VALUES 
        ('Default Supplier', 'contact@default.com', '123-456-7890');
      `;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Database initialized successfully.' }),
    };
  } catch (error) {
    console.error('Database Setup Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to initialize database.' }),
    };
  }
};

export { handler };