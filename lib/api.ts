
import { Product, Invoice, User } from '../types';

const getUserId = () => localStorage.getItem('inventory_user_id');

const request = async (endpoint: string, options: RequestInit = {}) => {
  const userId = getUserId();
  const isAuthRoute = endpoint.includes('/api/auth/');
  
  if (!userId && !isAuthRoute) {
    throw new Error('Session expired. Please log in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(endpoint, { ...options, headers });
    let data;
    try {
        data = await response.json();
    } catch (e) {
        throw new Error('Server returned an invalid response. Please try again later.');
    }

    if (!response.ok) {
      throw new Error(data.error || data.details || 'Server communication error');
    }

    return data;
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
};

export const api = {
  auth: {
    login: (credentials: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    signup: (userData: any) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  },
  products: {
    list: () => request('/api/products'),
    create: (data: any) => request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: Product) => request('/api/products', { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request('/api/products', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  customers: {
    list: () => request('/api/customers'),
    create: (data: any) => request('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request('/api/customers', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  suppliers: {
    list: () => request('/api/suppliers'),
    create: (data: any) => request('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request('/api/suppliers', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  categories: {
    list: () => request('/api/categories'),
    create: (name: string) => request('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: string) => request('/api/categories', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },
  invoices: {
    list: () => request('/api/invoices'),
    create: (data: any) => request('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request('/api/invoices', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  },
  purchaseOrders: {
    list: () => request('/api/purchase-orders'),
    create: (data: any) => request('/api/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  },
  ai: {
    generateInsights: (data: { products: Product[], invoices: Invoice[] }) => 
      request('/api/generate-insights', { method: 'POST', body: JSON.stringify(data) }),
  }
};
