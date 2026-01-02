
import React, { useState } from 'react';
import { BuildingStorefrontIcon } from './icons';
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
          // Specific handling for common Supabase errors
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please check your email and confirm your account before logging in.');
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
            setSuccessMsg("Account created! Check your email for a confirmation link (this is required by Supabase default settings).");
            setIsLogin(true);
            setPassword(''); // Clear password for security
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
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
          <p className="text-slate-500 font-medium mt-2">Inventory management powered by Supabase</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 p-8 sm:p-10 border border-slate-200">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); }}
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-transparent rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 py-3.5 px-4 text-sm font-medium transition-all"
                placeholder="Min. 6 characters"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-red-600 text-xs font-bold text-center leading-tight">{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-green-600 text-xs font-bold text-center leading-tight">{successMsg}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-primary-hover hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
              Note: Email verification is usually required by Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
