-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    name VARCHAR(255) NOT NULL UNIQUE, 
    email VARCHAR(255), 
    phone VARCHAR(50)
);

-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    name VARCHAR(255) NOT NULL, 
    phone VARCHAR(50) NOT NULL
);

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Create Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    "poNumber" VARCHAR(255) NOT NULL UNIQUE, 
    "supplierId" UUID REFERENCES suppliers(id), 
    "issueDate" DATE NOT NULL, 
    "totalCost" NUMERIC(10, 2) NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    notes TEXT
);

-- Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    "invoiceNumber" VARCHAR(255) NOT NULL UNIQUE, 
    "customerId" UUID REFERENCES customers(id), 
    "issueDate" DATE NOT NULL, 
    "totalAmount" NUMERIC(10, 2) NOT NULL
);

-- Create Products Table
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

-- Create Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE, 
    "productId" UUID, 
    "productName" VARCHAR(255) NOT NULL, 
    imei VARCHAR(255), 
    quantity INTEGER NOT NULL, 
    "sellingPrice" NUMERIC(10, 2) NOT NULL
);

-- Seed initial data
INSERT INTO categories (name) VALUES ('Smartphones'), ('Laptops'), ('Accessories'), ('Tablets') ON CONFLICT (name) DO NOTHING;
-- We check if the default customer exists before inserting to avoid errors on subsequent runs.
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM customers WHERE name = 'Walk-in Customer') THEN
      INSERT INTO customers (name, phone) VALUES ('Walk-in Customer', 'N/A');
   END IF;
END $$;
INSERT INTO suppliers (name, email, phone) VALUES ('Default Supplier', 'contact@default.com', '123-456-7890') ON CONFLICT (name) DO NOTHING;
