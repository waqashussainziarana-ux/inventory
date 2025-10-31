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