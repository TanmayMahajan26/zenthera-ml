import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Activity, Calendar, ShieldAlert, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth, backendApi, getAuthHeaders } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Report {
  _id: string;
  patient: { name: string; age: number; gender: string };
  fileName: string;
  organism: string;
  totalResistant: number;
  totalSusceptible: number;
  recommendedDrug: string;
  createdAt: string;
}

const ReportsPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/auth'); return; }
    fetchReports();
  }, [isAuthenticated, loading]);

  const fetchReports = async () => {
    try {
      const res = await backendApi.get('/api/reports', { headers: getAuthHeaders() });
      setReports(res.data);
    } catch { /* empty */ }
  };

  const filtered = reports.filter(r => 
    r.patient?.name.toLowerCase().includes(search.toLowerCase()) || 
    r.organism.toLowerCase().includes(search.toLowerCase()) ||
    r.fileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-500">
      <Navbar />

      <header className="pt-32 pb-16 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 text-brand-orange mb-4 font-bold uppercase tracking-[0.2em] text-sm">
              <FileText className="w-5 h-5" /><span>Analysis Archive</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic text-slate-900 dark:text-white leading-none">Reports</h1>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="relative w-full md:w-96 mb-10">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
          <input type="text" placeholder="Search by patient, organism, or file..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-medium dark:text-white" />
        </div>

        <div className="grid gap-6">
          {filtered.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-dark-surface p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-dark-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{r.patient?.name || 'Unknown Patient'}</h3>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {r.patient?.age}y • {r.patient?.gender}
                  </span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mb-4">{r.fileName}</div>
                
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-orange" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{r.organism}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 bg-slate-50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-dark-border">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-red-500 mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-bold font-mono text-xl">{r.totalResistant}</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resistant</div>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-dark-border" />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-brand-orange mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="font-bold font-mono text-xl">{r.totalSusceptible}</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Susceptible</div>
                </div>
              </div>

              <div className="md:w-48">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Recommended Tx</div>
                <div className="text-sm font-bold text-brand-orange">{r.recommendedDrug || 'Review Required'}</div>
              </div>

            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-slate-50 dark:bg-dark-surface rounded-[2rem] border border-slate-100 dark:border-dark-border border-dashed">
              <FileText className="w-10 h-10 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-500 dark:text-slate-400">No reports found</p>
            </div>
          )}
        </div>
      </main>

      <div className="grain-overlay opacity-[0.03]" />
    </div>
  );
};

export default ReportsPage;
