import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Shield, Zap, BarChart3, FlaskConical, Microscope, Dna, ChevronRight, ArrowUpRight } from 'lucide-react';
import Navbar from './Navbar';

/* ── Fade-in wrapper ─────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);



/* ── Main Component ──────────────────────────────────────── */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const features = [
    { icon: Shield, title: 'CARD Database Integration', desc: 'Deterministic resistance gene scanning against the Comprehensive Antibiotic Resistance Database for absolute clinical certainty.', tag: 'Security' },
    { icon: Zap, title: 'Real-Time Prediction', desc: 'Sub-second inference across 35 antibiotic classes using ensemble Random Forest and Logistic Regression classifiers.', tag: 'Speed' },
    { icon: BarChart3, title: 'Clinical Reports', desc: 'Auto-generated susceptibility profiles with trust scoring, organism matching, and treatment recommendations.', tag: 'Analytics' },
    { icon: FlaskConical, title: 'Mutation Scanner', desc: 'Point-mutation detection layer identifies known resistance-conferring SNPs across key genomic loci.', tag: 'Precision' },
    { icon: Microscope, title: 'Multi-Window Analysis', desc: 'Genome-wide scanning in 10kb chunks eliminates positional bias for comprehensive resistance detection.', tag: 'Coverage' },
    { icon: Dna, title: 'K-mer Intelligence', desc: 'Advanced TF-IDF vectorization of DNA k-mers captures structural variants invisible to alignment-based methods.', tag: 'AI/ML' },
  ];

  const steps = [
    { num: '01', title: 'Upload Genome', desc: 'Securely upload your FASTA, FNA, or FA genome files to our analysis pipeline.' },
    { num: '02', title: 'AI Extraction', desc: 'Our engine extracts k-mer signatures and scans for resistance genes and mutations.' },
    { num: '03', title: 'AMR Prediction', desc: 'Real-time susceptibility scoring across 35 antibiotic classes with confidence metrics.' },
    { num: '04', title: 'Clinical Report', desc: 'Receive structured treatment recommendations with trust-scored predictions.' },
  ];

  return (
    <div className="relative w-full bg-white">
      <Navbar />

      {/* ═══════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen w-full overflow-hidden bg-white">
        {/* ── Large orange-to-transparent gradient sweep ── */}
        <div className="absolute top-0 right-0 w-[70%] h-[80%] pointer-events-none"
          style={{ background: 'linear-gradient(220deg, rgba(241,90,36,0.10) 0%, rgba(241,90,36,0.04) 30%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[60%] h-[50%] pointer-events-none"
          style={{ background: 'linear-gradient(40deg, rgba(241,90,36,0.07) 0%, transparent 50%)' }} />

        {/* Fading dot grid */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'radial-gradient(circle, rgba(241,90,36,0.12) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 80%)',
          }}
        />

        {/* ── Orbs — scattered everywhere ── */}
        {/* Top area */}
        <div className="absolute -top-16 right-[20%] w-[400px] h-[400px] rounded-full bg-brand-orange/[0.08] blur-[120px] pointer-events-none" />
        <div className="absolute top-10 left-[15%] w-[200px] h-[200px] rounded-full bg-orange-200/30 blur-[80px] pointer-events-none" />
        <div className="absolute top-32 right-[8%] w-[150px] h-[150px] rounded-full bg-brand-orange/[0.06] blur-[60px] pointer-events-none" />
        {/* Middle area */}
        <div className="absolute top-[40%] left-[5%] w-[300px] h-[300px] rounded-full bg-orange-100/50 blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] right-[15%] w-[250px] h-[250px] rounded-full bg-brand-orange/[0.05] blur-[90px] pointer-events-none" />
        <div className="absolute top-[50%] left-[40%] w-[350px] h-[200px] rounded-full bg-orange-50/60 blur-[100px] pointer-events-none" />
        {/* Bottom area */}
        <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full bg-brand-orange/[0.07] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-[25%] w-[200px] h-[200px] rounded-full bg-orange-200/25 blur-[70px] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[30%] w-[180px] h-[180px] rounded-full bg-brand-orange/[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-10 right-[5%] w-[280px] h-[280px] rounded-full bg-orange-100/40 blur-[90px] pointer-events-none" />
        {/* Extra small accent orbs */}
        <div className="absolute top-[20%] left-[50%] w-[100px] h-[100px] rounded-full bg-brand-orange/[0.10] blur-[50px] pointer-events-none" />
        <div className="absolute top-[70%] right-[40%] w-[120px] h-[120px] rounded-full bg-orange-200/30 blur-[50px] pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
            {/* Left — Text */}
            <div className="flex-1 max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange/10 rounded-full border border-brand-orange/20 mb-8">
                <div className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-orange">Genomic Intelligence Platform</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1 }}
                className="font-display text-6xl md:text-8xl lg:text-[6.5rem] font-bold text-slate-900 leading-[0.9] tracking-tight mb-8">
                Predict{' '}
                <span className="relative inline-block">
                  <span className="text-brand-orange">AMR</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8 Q50 2, 100 6 T198 4" stroke="#F15A24" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                  </svg>
                </span>
                <br />
                <span className="text-slate-400 font-light italic text-[0.6em]">with</span>{' '}
                DNA.
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
                className="text-lg md:text-xl text-slate-500 max-w-lg mb-10 leading-relaxed font-light">
                Accelerating antibiotic resistance prediction through high-fidelity genomic intelligence and deterministic gene scanning.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-wrap items-center gap-4">
                <button onClick={() => navigate('/dashboard')}
                  className="group relative flex items-center gap-3 px-8 py-4 bg-brand-orange text-white rounded-full text-sm font-bold tracking-wide uppercase overflow-hidden shadow-xl shadow-brand-orange/25 hover:shadow-brand-orange/40 transition-all hover:scale-[1.02]">
                  <span className="relative z-10">Start Analysis</span>
                  <ArrowRight className="relative z-10 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-brand-orange-dark opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button className="flex items-center gap-2 px-6 py-4 text-sm font-semibold text-slate-600 hover:text-brand-orange transition-colors">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-brand-orange transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  Learn More
                </button>
              </motion.div>
            </div>

            {/* Right — Floating Dashboard Cards (Light Theme) */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex justify-center items-center relative min-h-[520px]">

              {/* ─── Floating Card: Alert (top-left) ─── */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-6 left-0 md:left-2 z-10">
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-lg">
                  <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 text-brand-orange" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">New Alert</div>
                    <div className="text-sm font-bold text-slate-900">MDR K. pneumoniae detected</div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Floating Card: Resistance Trend (top-right) ─── */}
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 0.5 }}
                className="absolute top-4 right-0 md:right-2 z-10">
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-lg w-[180px]">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">Resistance Rate</div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-brand-orange font-display">+34%</span>
                    <span className="text-xs text-slate-400">/mo</span>
                    <BarChart3 className="w-4 h-4 text-brand-orange ml-auto" />
                  </div>
                  <div className="flex items-end gap-[3px] h-10">
                    {[40, 55, 35, 60, 45, 70, 50, 80, 65, 90, 75, 95].map((h, i) => (
                      <motion.div key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 1 + i * 0.05 }}
                        className={`flex-1 rounded-sm ${i >= 10 ? 'bg-brand-orange' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                    <span className="text-[9px] text-slate-400">Jan — Jun 2026 · AI-tracked</span>
                  </div>
                </div>
              </motion.div>

              {/* ─── Main Card: Dashboard ─── */}
              <div className="relative z-10 w-[280px] md:w-[300px] mt-16">
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/80">
                  {/* Window chrome */}
                  <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">zenthera.ai · dashboard</span>
                  </div>

                  <div className="p-5">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Pipeline Accuracy</div>
                    <div className="flex items-baseline gap-3 mb-5">
                      <span className="text-4xl font-bold text-slate-900 font-display">98<span className="text-xl">%</span></span>
                      <span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">+12% ↑</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { code: 'ME', name: 'Meropenem', detail: 'Carbapenem', score: 96, resistant: true },
                        { code: 'CI', name: 'Ciprofloxacin', detail: 'Fluoroquinolone', score: 94, resistant: true },
                        { code: 'AM', name: 'Amikacin', detail: 'Aminoglycoside', score: 97, resistant: false },
                      ].map((row) => (
                        <div key={row.code} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: row.resistant ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', color: row.resistant ? '#ef4444' : '#10b981' }}>
                            {row.code}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900">{row.name}</div>
                            <div className="text-[10px] text-slate-400">{row.detail}</div>
                          </div>
                          <span className="text-sm font-bold text-slate-500">{row.score}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Weekly target</span>
                      <span className="text-xs font-bold text-slate-500">78%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '78%' }}
                        transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-brand-orange to-brand-orange-light rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Floating Card: AI Score (bottom-right) ─── */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 1 }}
                className="absolute bottom-6 right-0 md:right-4 z-10">
                <div className="flex items-center gap-3 bg-brand-orange text-white rounded-2xl px-4 py-3 shadow-lg shadow-brand-orange/20">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">AI Confidence</div>
                    <div className="text-lg font-bold font-display">97 · High Trust</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-medium">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 border-2 border-slate-300 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-1.5 bg-brand-orange rounded-full" />
          </motion.div>
        </motion.div>
      </section>


      {/* ═══════════════════════════════════════════
          ABOUT / INTRO SECTION
          ═══════════════════════════════════════════ */}
      <section id="section-about" className="relative py-32 md:py-40 bg-white overflow-hidden">
        {/* Dotted gradient background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundSize: '24px 24px',
            backgroundImage: 'radial-gradient(circle, rgba(241,90,36,0.06) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 50% 50% at 20% 30%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 20% 30%, black 0%, transparent 70%)',
          }}
        />
        {/* Soft gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-orange/[0.04] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-orange/[0.05] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-orange-50/60 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] bg-brand-orange/[0.06] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[30%] w-[350px] h-[350px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[60%] right-[10%] w-[200px] h-[200px] bg-brand-orange/[0.04] rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute bottom-[10%] left-[40%] w-[150px] h-[150px] bg-orange-100/40 rounded-full blur-[60px] pointer-events-none" />
        {/* Decorative DNA sequence text */}
        <div className="absolute top-20 left-8 text-[11px] font-mono text-slate-100 leading-loose pointer-events-none select-none tracking-[0.3em] rotate-90 origin-left">ATCGATCGATCGATCGATCGATCG</div>
        <div className="absolute bottom-16 right-12 text-[11px] font-mono text-slate-100 leading-loose pointer-events-none select-none tracking-[0.3em]">GCTAGCTAGCTAGCTA</div>
        {/* Decorative circles */}
        <div className="absolute top-1/4 right-[5%] w-48 h-48 rounded-full border border-orange-100/40 pointer-events-none" />
        <div className="absolute top-1/3 right-[7%] w-32 h-32 rounded-full border border-orange-100/30 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <div className="text-brand-orange text-xs font-bold uppercase tracking-[0.25em] mb-4">About Zenthera</div>
                <h2 className="font-display text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-8">
                  Decoding resistance.<br />
                  <span className="text-brand-orange">Saving lives.</span>
                </h2>
                <p className="text-lg text-slate-500 leading-relaxed mb-8 font-light">
                  Zenthera combines deterministic gene scanning with machine learning to predict antimicrobial resistance from raw genomic sequences. Our dual-layer pipeline processes FASTA files in real-time, delivering clinical-grade susceptibility profiles across 35 antibiotic classes.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['CARD Database', 'Mutation Detection', 'K-mer Analysis', 'Ensemble ML'].map((tag) => (
                    <span key={tag} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-brand-orange/10 to-orange-50 rounded-[3rem] blur-2xl opacity-60" />
                <div className="relative bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 aspect-square flex items-center justify-center overflow-hidden">
                  <video autoPlay loop muted playsInline className="w-full h-full object-cover rounded-2xl">
                    <source src="/dnaanimation.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-orange-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
                        <Dna className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Genome Analysis</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: '85%' }} transition={{ duration: 2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-brand-orange to-brand-orange-light rounded-full" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2 font-mono tracking-wider">PROCESSING K-MERS...</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FEATURES GRID
          ═══════════════════════════════════════════ */}
      <section className="relative py-32 bg-slate-50 overflow-hidden">
        {/* Dotted gradient — right side */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundSize: '28px 28px',
            backgroundImage: 'radial-gradient(circle, rgba(241,90,36,0.07) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 40% 60% at 85% 50%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 40% 60% at 85% 50%, black 0%, transparent 70%)',
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-brand-orange/[0.05] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-orange/[0.04] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-[15%] w-[250px] h-[250px] bg-orange-100/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[25%] left-[10%] w-[350px] h-[350px] bg-brand-orange/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[10%] left-[40%] w-[200px] h-[200px] bg-orange-200/25 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute top-[60%] right-[35%] w-[300px] h-[300px] bg-brand-orange/[0.03] rounded-full blur-[90px] pointer-events-none" />
        {/* DNA text accents */}
        <div className="absolute top-16 right-16 text-[10px] font-mono text-slate-200 pointer-events-none select-none tracking-[0.4em]">ATCG·GCTA·TTAA</div>
        <div className="absolute bottom-20 left-16 text-[10px] font-mono text-slate-200 pointer-events-none select-none tracking-[0.4em]">CTAG·AATT·GGCC</div>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <Reveal>
            <div className="text-center mb-20">
              <div className="text-brand-orange text-xs font-bold uppercase tracking-[0.25em] mb-4">Capabilities</div>
              <h2 className="font-display text-5xl md:text-6xl font-bold text-slate-900 mb-6">
                Built for <span className="text-brand-orange">precision</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light">
                Every component engineered for clinical-grade antimicrobial resistance prediction.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 300 }}
                  className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all cursor-pointer h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-orange transition-colors">
                      <f.icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{f.tag}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                  <div className="mt-6 flex items-center gap-1 text-brand-orange text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          WORKFLOW / HOW IT WORKS
          ═══════════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 bg-brand-dark text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundSize: '50px 50px', backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-orange/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-orange/[0.08] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-[10%] w-[300px] h-[300px] bg-brand-orange/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[20%] left-[20%] w-[200px] h-[200px] bg-orange-500/[0.05] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[30%] right-[20%] w-[250px] h-[250px] bg-orange-400/[0.07] rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <Reveal>
              <div>
                <div className="text-brand-orange text-xs font-bold uppercase tracking-[0.25em] mb-4">Workflow</div>
                <h2 className="font-display text-5xl md:text-6xl font-bold leading-tight">
                  From sequence<br />to <span className="text-brand-orange">insight</span>
                </h2>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-slate-400 text-lg max-w-sm font-light leading-relaxed">Four steps from raw genomic data to actionable clinical intelligence.</p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-brand-orange/30 to-transparent" />
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className="relative group">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-8 group-hover:border-brand-orange/50 group-hover:bg-brand-orange/10 transition-all">
                    <span className="text-2xl font-display font-bold text-brand-orange">{s.num}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA SECTION
          ═══════════════════════════════════════════ */}
      <section className="relative py-32 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
        {/* Dotted gradient — centered */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundSize: '32px 32px',
            backgroundImage: 'radial-gradient(circle, rgba(241,90,36,0.08) 1px, transparent 1px)',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 70%)',
          }}
        />
        {/* Radial circles & Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-orange-100/30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-orange-100/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-brand-orange/[0.04] blur-[60px] pointer-events-none" />
        <div className="absolute top-[10%] left-[15%] w-[250px] h-[250px] rounded-full bg-brand-orange/[0.06] blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[15%] w-[300px] h-[300px] rounded-full bg-orange-200/30 blur-[100px] pointer-events-none" />
        <div className="absolute top-[60%] left-[30%] w-[150px] h-[150px] rounded-full bg-brand-orange/[0.05] blur-[70px] pointer-events-none" />
        <div className="absolute top-[20%] right-[25%] w-[200px] h-[200px] rounded-full bg-orange-100/40 blur-[80px] pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange/10 rounded-full border border-brand-orange/20 mb-8">
              <Zap className="w-3 h-3 text-brand-orange" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-orange">Ready to begin?</span>
            </div>
            <h2 className="font-display text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight">
              Start predicting<br />resistance <span className="text-brand-orange">today</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-xl mx-auto mb-12 font-light leading-relaxed">
              Upload your FASTA genome file and receive clinical-grade AMR predictions in under a second.
            </p>
            <button onClick={() => navigate('/dashboard')}
              className="group inline-flex items-center gap-3 px-10 py-5 bg-brand-orange text-white rounded-full text-sm font-bold tracking-wide uppercase shadow-2xl shadow-brand-orange/30 hover:shadow-brand-orange/50 hover:scale-[1.03] transition-all">
              Launch Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer className="bg-brand-dark text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-4 gap-16 mb-20">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">Z</span>
                </div>
                <span className="text-2xl font-bold tracking-tight font-display">
                  Zenthera<span className="text-brand-orange">AI</span>
                </span>
              </div>
              <p className="text-slate-400 text-base max-w-sm leading-relaxed font-light">
                Empowering clinical diagnostics with predictive AI and high-performance computational biology.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Platform</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-brand-orange cursor-pointer transition-colors">AMR Prediction</li>
                <li className="hover:text-brand-orange cursor-pointer transition-colors">FASTA Analysis</li>
                <li className="hover:text-brand-orange cursor-pointer transition-colors">Clinical Reports</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Company</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li className="hover:text-brand-orange cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-brand-orange cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-brand-orange cursor-pointer transition-colors">Contact</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <p>© 2026 Zenthera AI. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-brand-orange cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-brand-orange cursor-pointer transition-colors">Terms</span>
            </div>
          </div>
        </div>
      </footer>

      <div className="grain-overlay" />
    </div>
  );
};

export default LandingPage;
