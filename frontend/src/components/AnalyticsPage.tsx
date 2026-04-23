import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Activity, Users, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from './Navbar';
import { useAuth, backendApi, getAuthHeaders } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#F15A24', '#FF7A45', '#ef4444', '#f59e0b', '#10b981', '#6366f1'];

const AnalyticsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    backendApi.get('/api/analytics', { headers: getAuthHeaders() })
      .then(res => setData(res.data))
      .catch(() => {});
  }, [isAuthenticated]);

  const resistancePie = data ? [
    { name: 'Resistant', value: data.overview.resistantCount },
    { name: 'Susceptible', value: data.overview.susceptibleCount },
  ] : [];

  const statusPie = data?.patientStatus?.map((s: any) => ({ name: s._id, value: s.count })) || [];

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-500">
      <Navbar />

      <header className="pt-32 pb-16 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 text-brand-orange mb-4 font-bold uppercase tracking-[0.2em] text-sm">
              <BarChart3 className="w-5 h-5" /><span>Intelligence Hub</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic text-slate-900 dark:text-white leading-none">Analytics</h1>
            <p className="mt-6 text-xl text-slate-500 dark:text-slate-400 max-w-2xl font-light">Real-time insights from MongoDB aggregation pipelines.</p>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-10">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Users, label: 'Total Patients', value: data?.overview?.totalPatients || 0, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
            { icon: FileText, label: 'AMR Reports', value: data?.overview?.totalReports || 0, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
            { icon: AlertTriangle, label: 'Critical Cases', value: data?.overview?.criticalPatients || 0, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
            { icon: TrendingUp, label: 'Resistant Found', value: data?.overview?.resistantCount || 0, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-dark-surface p-8 rounded-[2rem] border border-slate-100 dark:border-dark-border shadow-sm">
              <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center mb-5`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{card.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resistance Pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-surface p-10 rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Resistance Distribution</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Across All Reports</p>
            {resistancePie.length > 0 && resistancePie.some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={resistancePie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                    {resistancePie.map((_: any, idx: number) => (
                      <Cell key={idx} fill={idx === 0 ? '#ef4444' : '#F15A24'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">No report data yet</p>
                  <p className="text-xs mt-1">Run an AMR analysis and save the report</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-8 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-slate-500 font-bold">Resistant</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-orange" /><span className="text-xs text-slate-500 font-bold">Susceptible</span></div>
            </div>
          </motion.div>

          {/* Patient Status Pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white dark:bg-dark-surface p-10 rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Patient Status</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Current Distribution</p>
            {statusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                    {statusPie.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">No patient data yet</p>
                  <p className="text-xs mt-1">Add patients to see distribution</p>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-6 mt-4 flex-wrap">
              {statusPie.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-xs text-slate-500 font-bold">{s.name}</span></div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top Resistant Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white dark:bg-dark-surface p-10 rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Top Resistant Antibiotics</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Most Frequently Detected Resistance</p>
          {(data?.topResistant?.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topResistant}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: '12px', color: 'white', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#F15A24" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 dark:text-slate-500">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-bold">No resistance data yet</p>
                <p className="text-xs mt-1">Save AMR reports to populate this chart</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Top Organisms */}
        {(data?.topOrganisms?.length || 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Detected Organisms</h3>
            <div className="grid md:grid-cols-5 gap-4">
              {data.topOrganisms.map((o: any, i: number) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                  <div className="text-2xl font-bold text-brand-orange font-mono">{o.count}</div>
                  <div className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wider">{o._id}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <div className="grain-overlay opacity-[0.03]" />
    </div>
  );
};

export default AnalyticsPage;
