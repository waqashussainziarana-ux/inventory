
import React, { useState, useEffect } from 'react';
import { BuildingStorefrontIcon, CloseIcon } from './icons';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  // Check Supabase connection on mount
  useEffect(() => {
    const checkConn = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
        setDbConnected(!error);
      } catch {
        setDbConnected(false);
      }
    };
    checkConn();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Verification required: Please click the link sent to your email before logging in.');
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect email or password. Please try again.');
          }
          throw error;
        }

        if (data.user) {
          onAuthSuccess({
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name,
          });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        
        if (error) throw error;
        
        if (data.user) {
            setSuccessMsg("Account created! Important: Supabase requires email verification by default. Please check your inbox and confirm your account.");
            setIsLogin(true);
            setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copySql = () => {
    const sql = `-- RUN THIS IN SUPABASE SQL EDITOR TO INITIALIZE TABLES\n\n-- Products Table\nCREATE TABLE IF NOT EXISTS products (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  "productName" TEXT NOT NULL,\n  category TEXT,\n  "purchaseDate" DATE,\n  "purchasePrice" NUMERIC,\n  "sellingPrice" NUMERIC,\n  status TEXT DEFAULT 'Available',\n  notes TEXT,\n  "invoiceId" TEXT,\n  "purchaseOrderId" TEXT,\n  "trackingType" TEXT,\n  imei TEXT,\n  quantity INTEGER DEFAULT 1,\n  "customerName" TEXT\n);\n\n-- Customers Table\nCREATE TABLE IF NOT EXISTS customers (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  name TEXT NOT NULL,\n  phone TEXT\n);\n\n-- Suppliers Table\nCREATE TABLE IF NOT EXISTS suppliers (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  name TEXT NOT NULL,\n  email TEXT,\n  phone TEXT\n);\n\n-- Categories Table\nCREATE TABLE IF NOT EXISTS categories (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  name TEXT NOT NULL\n);\n\n-- Invoices\nCREATE TABLE IF NOT EXISTS invoices (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  "invoiceNumber" TEXT NOT NULL,\n  "customerId" UUID REFERENCES customers(id),\n  "customerName" TEXT,\n  "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  "totalAmount" NUMERIC\n);\n\n-- Invoice Items\nCREATE TABLE IF NOT EXISTS invoice_items (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "invoiceId" UUID REFERENCES invoices(id) ON DELETE CASCADE,\n  "productId" UUID,\n  "productName" TEXT,\n  imei TEXT,\n  quantity INTEGER,\n  "sellingPrice" NUMERIC\n);\n\n-- Purchase Orders\nCREATE TABLE IF NOT EXISTS purchase_orders (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  "userId" UUID NOT NULL,\n  "poNumber" TEXT NOT NULL,\n  "supplierId" UUID REFERENCES suppliers(id),\n  "supplierName" TEXT,\n  "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  "totalCost" NUMERIC,\n  status TEXT,\n  notes TEXT\n);`;
    navigator.clipboard.writeText(sql);
    alert("SQL Schema copied! Paste this into your Supabase Dashboard SQL Editor.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-[2rem] shadow-2xl shadow-indigo-200 mb-6">
            <BuildingStorefrontIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Inventory<span className="text-primary">Track</span></h1>
          <p className="text-slate-500 font-medium mt-3">Advanced IMEI & Stock Management</p>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 sm:p-12 relative overflow-hidden">
          {/* Decorative Shimmer */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10">
            <button 
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Full Business Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 px-6 text-sm font-bold transition-all outline-none"
                  placeholder="e.g. Gadget Solutions Ltd"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 px-6 text-sm font-bold transition-all outline-none"
                placeholder="admin@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Secure Password</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 px-6 text-sm font-bold transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-rose-600 text-xs font-bold leading-relaxed">{error}</p>
                {error.includes('Verification required') && (
                  <p className="text-rose-500 text-[10px] mt-2 font-medium">Tip: Check your spam folder if you haven't received it yet.</p>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100">
                <p className="text-emerald-700 text-xs font-bold leading-relaxed">{successMsg}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-primary-hover hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Enter Workspace' : 'Get Started')}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${dbConnected === null ? 'bg-slate-300 animate-pulse' : dbConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {dbConnected === null ? 'Connecting...' : dbConnected ? 'Cloud Active' : 'Offline'}
              </span>
            </div>
            <button 
              onClick={() => setShowSetup(!showSetup)}
              className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
            >
              {showSetup ? 'Hide Setup' : 'Database Setup Guide'}
            </button>
          </div>

          {/* Setup Guide Drawer */}
          {showSetup && (
            <div className="mt-6 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 animate-in zoom-in-95 duration-200">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-3">Initialize Supabase</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                If this is your first time using this Supabase project, you must run the SQL schema to create the required tables.
              </p>
              <button 
                onClick={copySql}
                className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                Copy SQL Schema to Clipboard
              </button>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-center mt-3 text-[10px] font-bold text-slate-400 hover:text-primary"
              >
                Go to Supabase Dashboard →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
