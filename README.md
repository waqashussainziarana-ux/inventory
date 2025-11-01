# Product Inventory & IMEI Tracker

A comprehensive application to manage product inventory, track unique IMEI numbers, and handle sales history. This project is built with React, TypeScript, and TailwindCSS, and deployed on Vercel.

## Features

-   Add products with IMEI or quantity-based tracking.
-   Create and manage purchase orders from suppliers.
-   Generate invoices for customers.
-   Dashboard with key inventory and sales metrics.
-   Manage customers, suppliers, and product categories.
-   Search across all inventory and sales data.
-   Archive sold or old products.
-   Generate printable PDF invoices and purchase orders.

## Tech Stack

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** TailwindCSS
-   **Backend:** Vercel Serverless Functions (Node.js)
-   **Database:** Neon (Serverless Postgres)
-   **Deployment:** Vercel

## Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    In your Vercel project settings, add an environment variable named `DATABASE_URL` with your Neon database connection string.
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
