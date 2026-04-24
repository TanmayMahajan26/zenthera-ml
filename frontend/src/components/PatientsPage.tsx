import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Edit3, Trash2, X, Activity, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from './Navbar';
import { useAuth, backendApi, getAuthHeaders } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  diagnosis: string;
  ward: string;
  status: string;
  createdAt: string;
}

const PatientsPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', contact: '', diagnosis: '', ward: 'General', status: 'Active' });
  
  // Patient details state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientReports, setPatientReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { navigate('/auth'); return; }
    fetchPatients();
  }, [isAuthenticated, loading]);

  const fetchPatients = async () => {
    try {
      const res = await backendApi.get('/api/patients', { headers: getAuthHeaders() });
      setPatients(res.data);
    } catch { /* empty */ }
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, age: Number(form.age) };
      if (editingId) {
        await backendApi.put(`/api/patients/${editingId}`, payload, { headers: getAuthHeaders() });
      } else {
        await backendApi.post('/api/patients', payload, { headers: getAuthHeaders() });
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', age: '', gender: 'Male', contact: '', diagnosis: '', ward: 'General', status: 'Active' });
      fetchPatients();
    } catch { /* empty */ }
  };

  const handleEdit = (p: Patient) => {
    setForm({ name: p.name, age: String(p.age), gender: p.gender, contact: p.contact, diagnosis: p.diagnosis, ward: p.ward, status: p.status });
    setEditingId(p._id);
    setShowModal(true);
  };

  const handleViewDetails = async (p: Patient) => {
    setSelectedPatient(p);
    setLoadingReports(true);
    try {
      const res = await backendApi.get(`/api/reports?patient=${p._id}`, { headers: getAuthHeaders() });
      setPatientReports(res.data);
    } catch {
      setPatientReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this patient?')) return;
    await backendApi.delete(`/api/patients/${id}`, { headers: getAuthHeaders() });
    fetchPatients();
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.diagnosis.toLowerCase().includes(search.toLowerCase()));

  const statusColor = (s: string) => {
    if (s === 'Critical') return 'bg-red-600 text-white';
    if (s === 'Discharged') return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    return 'bg-brand-orange text-white';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors duration-500">
      <Navbar />

      <header className="pt-32 pb-16 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 text-brand-orange mb-4 font-bold uppercase tracking-[0.2em] text-sm">
                <Users className="w-5 h-5" /><span>Patient Records</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-serif italic text-slate-900 dark:text-white leading-none">Patients</h1>
              <p className="mt-6 text-xl text-slate-500 dark:text-slate-400 max-w-2xl font-light">Manage patient data, track diagnoses, and link AMR reports.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowModal(true); setEditingId(null); setForm({ name: '', age: '', gender: 'Male', contact: '', diagnosis: '', ward: 'General', status: 'Active' }); }}
                className="px-8 py-4 bg-brand-orange text-white rounded-full text-sm font-bold tracking-wider uppercase flex items-center gap-2 hover:bg-brand-orange-dark transition-all shadow-lg shadow-brand-orange/20">
                <Plus className="w-4 h-4" /> Add Patient
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Search */}
        <div className="relative w-full md:w-96 mb-10">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
          <input type="text" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-medium dark:text-white" />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-dark-border">
                  {['Name', 'Age', 'Gender', 'Diagnosis', 'Ward', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 dark:border-dark-border hover:bg-slate-50/50 dark:hover:bg-dark-bg/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-orange transition-colors" onClick={() => handleViewDetails(p)}>
                      {p.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{p.age}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.gender}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.diagnosis || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{p.ward}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${statusColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(p)} className="p-2 rounded-xl hover:bg-brand-orange/10 text-slate-400 hover:text-brand-orange transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p._id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-4 opacity-30" />
              <p className="font-bold">No patients found</p>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-2xl w-full max-w-lg p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif italic text-slate-900 dark:text-white">{editingId ? 'Edit Patient' : 'New Patient'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-bg transition-colors text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                  { label: 'Age', key: 'age', type: 'number', placeholder: '45' },
                  { label: 'Contact', key: 'contact', type: 'text', placeholder: '+91 98765 43210' },
                  { label: 'Diagnosis', key: 'diagnosis', type: 'text', placeholder: 'Pneumonia' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">{f.label}</label>
                    <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-medium dark:text-white" />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Gender</label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Ward</label>
                    <select value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                      <option>General</option><option>ICU</option><option>Pediatric</option><option>Oncology</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                      <option>Active</option><option>Critical</option><option>Discharged</option>
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} className="w-full mt-8 py-4 bg-brand-orange text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-brand-orange-dark transition-all shadow-lg shadow-brand-orange/20">
                {editingId ? 'Update Patient' : 'Add Patient'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Details Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-dark-surface rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 mt-10 mb-10">
              
              {/* Header */}
              <div className="flex items-start justify-between mb-8 border-b border-slate-100 dark:border-dark-border pb-6">
                <div>
                  <h2 className="text-4xl font-serif italic text-slate-900 dark:text-white mb-2">{selectedPatient.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> {selectedPatient.diagnosis || 'No diagnosis'}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Age: {selectedPatient.age}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Gender: {selectedPatient.gender}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Ward: {selectedPatient.ward}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button onClick={() => setSelectedPatient(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-bg transition-colors text-slate-400"><X className="w-5 h-5" /></button>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor(selectedPatient.status)}`}>{selectedPatient.status}</span>
                </div>
              </div>

              {/* Reports Section */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Associated ML Reports
                </h3>

                {loadingReports ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin mb-4" />
                    <p className="text-sm">Fetching reports...</p>
                  </div>
                ) : patientReports.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {patientReports.map(report => (
                      <div key={report._id} className="bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl p-6 hover:border-brand-orange/30 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                            <h4 className="font-bold text-slate-900 dark:text-white">{report.organism}</h4>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{(report.seqLength / 1000000).toFixed(2)} Mbps</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{report.gcContent}% GC</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">Resistance Profile</p>
                            <div className="flex gap-2">
                              <span className="flex-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-between">
                                Resistant <span className="font-bold">{report.totalResistant}</span>
                              </span>
                              <span className="flex-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-between">
                                Susceptible <span className="font-bold">{report.totalSusceptible}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">Recommended Course</p>
                            <div className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-lg p-3 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              {report.recommendedDrug.includes('Combination') ? (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              )}
                              {report.recommendedDrug}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No ML reports found for this patient.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grain-overlay opacity-[0.03]" />
    </div>
  );
};

export default PatientsPage;
