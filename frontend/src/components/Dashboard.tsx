import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Database, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  Info,
  Target,
  CheckCircle2
} from 'lucide-react';
import Navbar from './Navbar';
import { uploadGenome } from '../api/predictApi';
import { useAuth, backendApi, getAuthHeaders } from '../context/AuthContext';

interface DashboardResult {
  id: string;
  antibiotic: string;
  prediction: 'Resistant' | 'Susceptible';
  confidence: number;
  mechanism?: string;
  model: string;
  confidence_tier: string;
}

interface GenomeInfo {
  header: string;
  seq_length: number;
  gc_pct: number;
  organism_match: boolean;
  matched_genus: string | null;
}

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
}

const Dashboard: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'vigilance' | 'vengeance'>('vigilance');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [results, setResults] = useState<DashboardResult[]>([]);
  const [genomeInfo, setGenomeInfo] = useState<GenomeInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicalData, setClinicalData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'resistant' | 'susceptible'>('all');

  useAuth(); // ensure auth context is available
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Inline patient form
  const [patientForm, setPatientForm] = useState({
    name: '', age: '', gender: 'Male', contact: '', diagnosis: '', ward: 'General', status: 'Active'
  });

  const isPatientFormValid = patientForm.name.trim() !== '' && patientForm.age.trim() !== '';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.fasta') || f.name.endsWith('.fna') || f.name.endsWith('.fa')
    );
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [isPatientFormValid]);

  const handleFileUpload = async (file: File) => {
    if (!isPatientFormValid) {
      setError('Please fill in patient Name and Age before uploading.');
      return;
    }
    setError(null);
    const newFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      status: 'uploading',
      progress: 0
    };
    setUploadedFiles([newFile]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadedFiles(prev => prev.map(f =>
        f.id === newFile.id ? { ...f, progress: Math.min(progress, 90) } : f
      ));
      if (progress >= 90) clearInterval(interval);
    }, 100);

    try {
      setIsAnalyzing(true);

      // Step 1: Create the patient
      const patientPayload = { ...patientForm, age: Number(patientForm.age) };
      const patientRes = await backendApi.post('/api/patients', patientPayload, { headers: getAuthHeaders() });
      const newPatientId = patientRes.data._id;

      // Step 2: Upload FASTA and get ML predictions
      const apiResult = await uploadGenome(file);

      setUploadedFiles(prev => prev.map(f =>
        f.id === newFile.id ? { ...f, status: 'complete', progress: 100 } : f
      ));
      setGenomeInfo(apiResult.genome);

      const dashboardResults: DashboardResult[] = apiResult.predictions
        .filter((p: any) => p.phenotype !== 'Insufficient Data')
        .map((p: any, idx: number) => ({
          id: idx.toString(),
          antibiotic: p.antibiotic,
          prediction: p.phenotype,
          confidence: p.confidence,
          model: p.model,
          confidence_tier: p.confidence_tier,
          mechanism: p.det_found ? p.det_type : undefined
        }));

      setResults(dashboardResults);
      setClinicalData(apiResult.clinical);
      setRecommendations(apiResult.recommendation);
      setIsAnalyzing(false);
      setTimeout(() => setActiveTab('vengeance'), 800);

      // Step 3: Auto-save report linked to the new patient
      const reportPayload = {
        patient: newPatientId,
        fileName: file.name,
        organism: apiResult.genome.matched_genus || 'Unknown',
        seqLength: apiResult.genome.seq_length,
        gcContent: apiResult.genome.gc_pct,
        predictions: dashboardResults.map(r => ({
          antibiotic: r.antibiotic,
          phenotype: r.prediction,
          confidence: r.confidence,
          model: r.model,
          confidence_tier: r.confidence_tier
        })),
        totalResistant: dashboardResults.filter(r => r.prediction === 'Resistant').length,
        totalSusceptible: dashboardResults.filter(r => r.prediction === 'Susceptible').length,
        recommendedDrug: apiResult.recommendation?.first_line?.[0]?.antibiotic || 'Unknown'
      };
      await backendApi.post('/api/reports', reportPayload, { headers: getAuthHeaders() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
      setUploadedFiles(prev => prev.map(f =>
        f.id === newFile.id ? { ...f, status: 'error' } : f
      ));
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg selection:bg-brand-orange selection:text-white transition-colors duration-500">
      <Navbar />

      {/* Page Header */}
      <header className="pt-32 pb-16 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8"
          >
            <div>
              <div className="flex items-center gap-3 text-brand-orange mb-4 font-bold uppercase tracking-[0.2em] text-sm">
                <Activity className="w-5 h-5" />
                <span>Diagnostic Portal</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-serif italic text-slate-900 dark:text-white leading-none">
                {activeTab === 'vigilance' ? 'Vigilance' : 'Vengeance'}
              </h1>
              <p className="mt-6 text-xl text-slate-500 dark:text-slate-400 max-w-2xl font-light">
                {activeTab === 'vigilance' 
                  ? 'Advanced processing engine for raw genomic data and k-mer signature extraction.' 
                  : 'Actionable resistance predictions and susceptibility intelligence.'}
              </p>
            </div>
            
            <div className="flex gap-4">
               <button 
                onClick={() => setActiveTab('vigilance')}
                className={`px-8 py-4 rounded-full text-sm font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'vigilance' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-orange'
                }`}
              >
                Vigilance
              </button>
                  <button 
                onClick={() => setActiveTab('vengeance')}
                disabled={results.length === 0}
                className={`px-8 py-4 rounded-full text-sm font-bold tracking-wider uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  activeTab === 'vengeance' 
                    ? 'bg-slate-900 dark:bg-brand-orange text-white' 
                    : 'bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-border hover:border-brand-orange'
                }`}
              >
                Vengeance
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <AnimatePresence mode="wait">
          {activeTab === 'vigilance' ? (
            <motion.div 
              key="vigilance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-3 gap-12"
            >
              {/* Upload Zone */}
              <div className="lg:col-span-2 space-y-8">
                {/* Patient Details Form */}
                <div className="bg-white dark:bg-dark-surface p-8 rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-brand-orange" /> Patient Information
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Fill in patient details before uploading genomic data.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Patient Name *', key: 'name', type: 'text', placeholder: 'John Doe' },
                      { label: 'Age *', key: 'age', type: 'number', placeholder: '45' },
                      { label: 'Contact', key: 'contact', type: 'text', placeholder: '+91 98765 43210' },
                      { label: 'Diagnosis', key: 'diagnosis', type: 'text', placeholder: 'Suspected UTI' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">{f.label}</label>
                        <input type={f.type} value={(patientForm as any)[f.key]} onChange={e => setPatientForm({ ...patientForm, [f.key]: e.target.value })} placeholder={f.placeholder}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange font-medium dark:text-white" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Gender</label>
                      <select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Ward</label>
                      <select value={patientForm.ward} onChange={e => setPatientForm({ ...patientForm, ward: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                        <option>General</option><option>ICU</option><option>Pediatric</option><option>Oncology</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5 block">Status</label>
                      <select value={patientForm.status} onChange={e => setPatientForm({ ...patientForm, status: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-sm font-medium dark:text-white">
                        <option>Active</option><option>Critical</option><option>Discharged</option>
                      </select>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
                    <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-xs">Analysis Error</p>
                      <p className="text-sm opacity-80">{error}</p>
                    </div>
                  </div>
                )}
                <div 
                  onDragOver={isPatientFormValid ? handleDragOver : undefined}
                  onDragLeave={isPatientFormValid ? handleDragLeave : undefined}
                  onDrop={isPatientFormValid ? handleDrop : undefined}
                  className={`relative aspect-[16/9] lg:aspect-auto lg:h-[320px] rounded-[40px] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12 overflow-hidden ${
                    !isPatientFormValid 
                      ? 'border-slate-100 dark:border-dark-border/50 bg-slate-50/20 dark:bg-dark-surface/20 opacity-50 cursor-not-allowed'
                      : isDragging 
                        ? 'border-brand-orange bg-brand-orange/5 scale-[1.01]' 
                        : 'border-slate-200 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/50 hover:bg-slate-50 dark:hover:bg-dark-surface hover:border-brand-orange/50 cursor-pointer'
                  }`}
                >
                  <input 
                    type="file" 
                    className={`absolute inset-0 w-full h-full opacity-0 ${isPatientFormValid ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onChange={(e) => isPatientFormValid && e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    disabled={!isPatientFormValid || isAnalyzing}
                  />
                  
                  <div className="w-16 h-16 bg-white dark:bg-dark-bg rounded-3xl shadow-xl flex items-center justify-center mb-6">
                    <Upload className={`w-7 h-7 transition-colors ${!isPatientFormValid ? 'text-slate-200' : isDragging ? 'text-brand-orange' : 'text-slate-400'}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Drop Sequence Data</h3>
                  <p className="text-slate-500 text-center max-w-sm mb-6">
                    {isPatientFormValid ? (
                      <>Select <span className="text-brand-orange font-mono">.fasta</span>, <span className="text-brand-orange font-mono">.fna</span>, or <span className="text-brand-orange font-mono">.fa</span> genomic files for analysis.</>
                    ) : (
                      <span className="text-red-500/80 font-bold">Please fill in patient Name and Age first</span>
                    )}
                  </p>
                  
                  <div className="px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-bold tracking-widest uppercase">
                    Browse Files
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-4">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-slate-900">{file.name}</span>
                            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{file.status}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-brand-orange"
                              initial={{ width: 0 }}
                              animate={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specs & Info */}
              <div className="space-y-8">
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Database className="w-24 h-24" />
                   </div>
                   <h4 className="text-xl font-bold mb-8 flex items-center gap-3">
                      <Cpu className="text-brand-orange w-5 h-5" />
                      Platform Status
                   </h4>
                   <div className="space-y-6 font-mono text-xs">
                      {[
                        { label: "Cluster_Node", val: "ALPHA-9", color: "text-green-400" },
                        { label: "GPU_Compute", val: "Active", color: "text-brand-orange" },
                        { label: "Memory_Usage", val: "14.2 GB", color: "text-slate-300" },
                        { label: "Encryption", val: "AES-256", color: "text-slate-300" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b border-slate-800 pb-4 last:border-0">
                          <span className="text-slate-500 uppercase">{item.label}</span>
                          <span className={item.color}>{item.val}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-dark-surface rounded-[3rem] p-10 border border-slate-100 dark:border-dark-border">
                  <h4 className="text-xl font-bold mb-6 flex items-center gap-3 dark:text-white">
                    <Info className="text-brand-orange w-5 h-5" />
                    Security Protocol
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                    All genomic data is processed within an isolated sandbox. We do not store sequences after analysis unless explicitly requested for research collaboration.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="vengeance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Results Overview */}
              <div className="space-y-12 pb-24">
                
                {/* Clinical Context / Disease Name */}
                {clinicalData && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 text-brand-orange mb-6 font-bold uppercase tracking-[0.2em] text-xs">
                        <Activity className="w-5 h-5" />
                        <span>Clinical Intelligence</span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-serif italic mb-6">{clinicalData.name}</h2>
                      <div className="grid md:grid-cols-2 gap-12">
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Associated Pathologies</h4>
                          <ul className="space-y-3">
                            {clinicalData.diseases.map((d: string, i: number) => (
                              <li key={i} className="flex items-center gap-3 text-slate-300">
                                <div className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Clinical Notes</h4>
                          <p className="text-slate-400 leading-relaxed italic">"{clinicalData.notes}"</p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                      <ShieldCheck className="w-64 h-64" />
                    </div>
                  </motion.div>
                )}

                {/* Main Predictions Table */}
                <div className="space-y-6">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-3xl font-serif italic text-slate-900 dark:text-white">Resistance Profile</h3>
                      {saveSuccess && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-1.5 rounded-full border border-green-200">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Report Auto-Saved</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                      {/* Search Bar */}
                      <div className="relative flex-1 md:w-64">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Activity className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search antibiotic..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium dark:text-white"
                        />
                      </div>

                      {/* Filters */}
                      <div className="flex bg-slate-50 dark:bg-dark-surface p-1 rounded-full border border-slate-100 dark:border-dark-border">
                        {(['all', 'resistant', 'susceptible'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                              filter === f 
                                ? 'bg-white dark:bg-brand-orange text-slate-900 dark:text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {results
                      .filter(r => {
                        const matchesSearch = r.antibiotic.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesFilter = filter === 'all' || r.prediction.toLowerCase() === filter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((r, i) => (
                        <motion.div 
                          key={r.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{ y: -5, scale: 1.02 }}
                          className="bg-white dark:bg-dark-surface p-8 rounded-[2.5rem] border border-slate-100 dark:border-dark-border shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-brand-orange/10 transition-all relative overflow-hidden group"
                        >
                          {/* Status Background Glow */}
                          <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${
                            r.prediction === 'Resistant' ? 'bg-red-500' : 'bg-brand-orange'
                          }`} />

                          <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner ${
                                r.prediction === 'Resistant' 
                                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
                                  : 'bg-brand-orange/10 text-brand-orange'
                              }`}>
                                {r.antibiotic.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-brand-orange transition-colors">
                                  {r.antibiotic}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {r.mechanism ? (
                                    <span className="text-[10px] font-bold text-red-500/80 dark:text-red-400/80 uppercase tracking-widest flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3" /> {r.mechanism}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                      <Cpu className="w-3 h-3" /> ML Pattern
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                              r.prediction === 'Resistant' 
                                ? 'bg-red-600 text-white ring-4 ring-red-50 dark:ring-red-900/20' 
                                : 'bg-brand-orange text-white ring-4 ring-orange-50 dark:ring-orange-900/20'
                            }`}>
                              {r.prediction}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Confidence Score</span>
                                <span className="text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">{r.confidence_tier} TRUST</span>
                              </div>
                              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{r.confidence}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-50 dark:bg-dark-bg rounded-full overflow-hidden border border-slate-100 dark:border-dark-border p-0.5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${r.confidence}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                className={`h-full rounded-full ${
                                  r.prediction === 'Resistant' ? 'bg-red-400' : 'bg-brand-orange'
                                }`}
                              />
                            </div>
                            <div className="flex justify-between items-center pt-2 text-[9px] font-mono font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                               <span>MODEL_ID: {r.model.toUpperCase()}</span>
                               <span>RES_CORE_01</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>

                </div>

                {/* Final Recommendation / Preferred Option */}
                {recommendations && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-brand-orange rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden"
                  >
                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                      <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full mb-8 font-bold uppercase tracking-[0.2em] text-[10px]">
                        <Target className="w-4 h-4" />
                        <span>Preferred Treatment Protocol</span>
                      </div>
                      
                      {recommendations.first_line.length > 0 ? (
                        <>
                          <h3 className="text-4xl md:text-5xl font-serif italic mb-6">
                            {recommendations.first_line[0].antibiotic} is highly recommended.
                          </h3>
                          <p className="text-white/80 leading-relaxed mb-8">
                            Based on the genomic analysis and {genomeInfo?.matched_genus || 'organism'} profiling, 
                            <span className="font-bold text-white"> {recommendations.first_line[0].antibiotic} </span> 
                            shows the highest susceptibility confidence with minimal resistance risk.
                          </p>
                        </>
                      ) : (
                        <h3 className="text-3xl font-serif italic mb-6">No first-line antibiotics recommended.</h3>
                      )}

                      <div className="grid md:grid-cols-3 gap-4">
                        <button className="bg-white text-brand-orange px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                          Download Protocol
                        </button>
                        <button onClick={() => {setResults([]); setActiveTab('vigilance');}} className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                          New Analysis
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background Grain */}
      <div className="grain-overlay opacity-[0.03]" />
    </div>
  );
};

export default Dashboard;
