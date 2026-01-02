
import React, { useState } from 'react';
import { BuildingStorefrontIcon } from './icons';
import { User } from '../types';
import { api } from '../lib/api';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { user } = await api.auth.login({ email, password });
        if (user) {
          localStorage.setItem('inventory_user_id', user.id);
          localStorage.setItem('inventory_user_data', JSON.stringify(user));
          onAuthSuccess(user);
        }
      } else {
        const { user } = await api.auth.signup({ email, password, name });
        if (user) {
            setSuccessMsg("Account created! You can now log in.");
            setIsLogin(true);
            setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-[2rem] shadow-2xl shadow-indigo-200 mb-6">
            <BuildingStorefrontIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Inventory<span className="text-primary">Track</span></h1>
          <p className="text-slate-500 font-medium mt-3">Professional IMEI & Stock Control</p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Display Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl py-4 px-6 text-sm font-bold transition-all outline-none"
                  placeholder="John Doe"
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Password</label>
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
              <div className="p-5 bg-rose-50 rounded-2xl border-2 border-rose-100">
                <p className="text-rose-600 text-xs font-bold leading-relaxed">{error}</p>
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
              {isLoading ? 'Processing...' : (isLogin ? 'Enter App' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
