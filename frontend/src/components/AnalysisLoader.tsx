import React, { useState, useEffect } from 'react';
import { Dna, Database, Cpu, FileCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface STEP {
  id: number;
  label: string;
  icon: React.ReactNode;
  duration: number;
}

const STEPS: STEP[] = [
  { id: 1, label: 'Uploading genomic data...', icon: <Database className="w-5 h-5" />, duration: 1500 },
  { id: 2, label: 'Extracting k-mer frequencies...', icon: <Dna className="w-5 h-5" />, duration: 2500 },
  { id: 3, label: 'Running ML classification model...', icon: <Cpu className="w-5 h-5" />, duration: 2000 },
  { id: 4, label: 'Generating resistance profile...', icon: <FileCheck className="w-5 h-5" />, duration: 1500 },
];

interface AnalysisLoaderProps {
  onComplete: () => void;
}

const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < STEPS.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, STEPS[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(finishTimer);
    }
  }, [currentStep, onComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto py-20 px-12 bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden text-center">
      <div className="relative flex flex-col items-center">
        {/* DNA Animation */}
        <div className="relative w-32 h-32 mb-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-2 border-dashed border-brand-orange/20 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center text-brand-orange"
          >
            <Dna className="w-12 h-12" />
          </motion.div>
        </div>

        <h3 className="text-4xl font-serif italic text-slate-900 mb-4">Analyzing Sequence</h3>
        <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.3em] mb-16">Intelligence in progress</p>

        {/* Steps */}
        <div className="w-full space-y-8 text-left max-w-md mx-auto">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700
                    ${isActive ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/20 scale-110' : 
                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300'}
                  `}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-bold tracking-wide transition-colors duration-300
                        ${isActive ? 'text-slate-900' : isCompleted ? 'text-slate-500' : 'text-slate-300'}
                      `}>
                        {step.label}
                      </span>
                      {isActive && <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-brand-orange font-mono font-bold tracking-widest"
                      >
                        RUNNING
                      </motion.span>}
                    </div>
                    {/* Progress Bar Background */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      {isActive && (
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: "0%" }}
                          transition={{ duration: step.duration / 1000, ease: "easeInOut" }}
                          className="h-full w-full bg-brand-orange rounded-full"
                        />
                      )}
                      {isCompleted && <div className="h-full w-full bg-green-500 rounded-full" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-20 pt-8 border-t border-slate-50 flex justify-center">
        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-bold">
          Engine: Zenthera-Vengeance-Core
        </p>
      </div>
    </div>
  );
};

export default AnalysisLoader;
