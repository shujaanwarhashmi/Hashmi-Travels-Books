import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../App';

const Login: React.FC = () => {
  const { enterGuestMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await (supabase.auth as any).signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-bg p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-sky-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[450px] relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-10 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-500 rounded-2xl mb-6 shadow-xl shadow-sky-500/20">
              <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">Hashmi Travels</h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Accounting Core • V3.2</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 pt-4 space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in shake duration-300">
                <i className="fa-solid fa-triangle-exclamation"></i>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Identity</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@travels.com"
                  className="w-full bg-slate-800/50 border border-slate-700 focus:border-sky-500 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Access Key</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-slate-700 focus:border-sky-500 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold text-white outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-sky-900/20 transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <i className="fa-solid fa-circle-notch animate-spin"></i>
              ) : (
                <i className="fa-solid fa-right-to-bracket"></i>
              )}
              Initialize System Access
            </button>

            <div className="relative flex items-center justify-center py-4">
              <div className="h-[1px] w-full bg-slate-800"></div>
              <span className="absolute bg-[#0f172a] px-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">or</span>
            </div>

            <button 
              type="button"
              onClick={enterGuestMode}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
            >
              <i className="fa-solid fa-user-secret"></i> Enter Demo mode
            </button>
          </form>
        </div>

        <div className="mt-8 text-center flex flex-col items-center gap-4">
          <p className="text-[9px] font-bold text-slate-700 uppercase leading-relaxed max-w-[300px]">
            This portal is restricted for Hashmi Travels employees. If Auth is not working, use Demo mode.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
