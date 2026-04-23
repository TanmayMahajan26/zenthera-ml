import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'fasta' || extension === 'fna' || extension === 'fa') {
        onFileSelect(file);
      } else {
        setError('Invalid file type. Please upload a .fasta or .fna file.');
      }
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.fasta', '.fna', '.fa'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const selectedFile = acceptedFiles[0];

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative group cursor-pointer transition-all duration-500 border-2 border-dashed rounded-[2.5rem] p-16 text-center
          ${isDragActive ? 'border-brand-orange bg-brand-orange/5 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 hover:border-brand-orange/50 hover:bg-slate-50'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
            <Upload className={`w-8 h-8 transition-colors ${isDragActive ? 'text-brand-orange' : 'text-slate-400'}`} />
          </div>
          <h3 className="text-3xl font-serif italic text-slate-900 mb-4">
            {isDragActive ? 'Drop sequence here' : 'Genomic Data Ingest'}
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            Drag and drop your <span className="font-mono font-bold text-brand-orange">.fasta</span> or <span className="font-mono font-bold text-brand-orange">.fna</span> sequences here
          </p>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-slate-100 group-hover:border-brand-orange/30 rounded-tl-xl transition-colors" />
        <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-slate-100 group-hover:border-brand-orange/30 rounded-tr-xl transition-colors" />
        <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-slate-100 group-hover:border-brand-orange/30 rounded-bl-xl transition-colors" />
        <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-slate-100 group-hover:border-brand-orange/30 rounded-br-xl transition-colors" />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold uppercase tracking-wider"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {selectedFile && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 bg-white border border-slate-100 shadow-sm rounded-3xl flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                <File className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-xs">{selectedFile.name}</p>
                <p className="text-xs font-mono text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {!isProcessing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null as any);
                }}
                className="p-3 hover:bg-slate-50 rounded-full transition-colors text-slate-300 hover:text-red-500"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
