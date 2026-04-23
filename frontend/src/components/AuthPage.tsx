import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Activity, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, role);
      }
      navigate('/patients');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg selection:bg-brand-orange selection:text-white transition-colors duration-500">
      <Navbar />

      <div className="flex items-center justify-center min-h-screen pt-20 px-6">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-orange/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-orange/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange/10 rounded-full border border-brand-orange/20 mb-6">
              <Activity className="w-3 h-3 text-brand-orange" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-orange">Secure Access</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-serif italic text-slate-900 dark:text-white mb-4">
              {isLogin ? 'Welcome Back' : 'Join Zenthera'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-light">
              {isLogin ? 'Sign in to access the diagnostic platform.' : 'Create your account to get started.'}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-xl p-10">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium text-slate-900 dark:text-white"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium text-slate-900 dark:text-white"
                  placeholder="doctor@zenthera.ai"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium text-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium text-slate-900 dark:text-white"
                  >
                    <option value="doctor">Doctor</option>
                    <option value="lab_tech">Lab Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-orange text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-brand-orange-dark transition-all shadow-xl shadow-brand-orange/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand-orange transition-colors"
              >
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <span className="font-bold text-brand-orange">{isLogin ? 'Sign Up' : 'Sign In'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grain-overlay opacity-[0.03]" />
    </div>
  );
};

export default AuthPage;
