
import React, { useState } from 'react';
import { BuildingStorefrontIcon } from './icons';
import { User } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSetupMessage(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try {
          data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
          throw new Error("Server returned an invalid response. The database might not be initialized.");
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Authentication failed. Please check your credentials.');
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupDatabase = async () => {
    if (!confirm("This will create the necessary database tables. Continue?")) return;
    setIsSettingUp(true);
    setError(null);
    setSetupMessage(null);
    
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSetupMessage(data.message || "Database tables initialized successfully!");
      } else {
        throw new Error(data.error || "Failed to initialize database.");
      }
    } catch (err: any) {
      setError(err.message + " (Check your DATABASE_URL environment variable)");
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl shadow-xl shadow-indigo-100 mb-4">
            <BuildingStorefrontIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventory<span className="text-primary">Track</span></h1>
          <p className="text-slate-500 font-medium mt-2">Manage your stock, sales, and insights.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-8 sm:p-10 border border-slate-200">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-transparent rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 py-3.5 px-4 text-sm font-medium transition-all"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-transparent rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 py-3.5 px-4 text-sm font-medium transition-all"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-transparent rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 py-3.5 px-4 text-sm font-medium transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-red-600 text-xs font-bold text-center leading-tight">{error}</p>
                {error.includes("relation \"users\" does not exist") && (
                   <p className="text-red-500 text-[10px] text-center mt-2 font-medium">Tip: Use the 'Initialize Database' button below.</p>
                )}
              </div>
            )}

            {setupMessage && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-green-600 text-xs font-bold text-center">{setupMessage}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || isSettingUp}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-primary-hover hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In to Account' : 'Create My Account')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <button 
              onClick={handleSetupDatabase}
              disabled={isSettingUp}
              className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-primary transition-colors disabled:opacity-50"
             >
               {isSettingUp ? 'Initializing System...' : 'First time? Initialize Database'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
