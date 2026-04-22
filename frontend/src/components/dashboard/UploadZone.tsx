import { Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

export function UploadZone({ onUpload, isAnalyzing }: { onUpload: (f: File) => void; isAnalyzing: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!isAnalyzing && e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  }

  return (
    <div 
      className={`corner-brackets relative border border-dashed rounded-md p-8 text-center overflow-hidden group transition-colors cursor-pointer ${drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        accept=".fasta,.fa,.fna" 
        onChange={(e) => {
          if (e.target.files?.[0] && !isAnalyzing) {
            onUpload(e.target.files[0]);
          }
        }} 
      />
      {/* Scanline effect */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        {isAnalyzing ? (
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-warning animate-spin" />
        ) : (
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
        <p className="font-display text-sm text-foreground mb-1">
          {isAnalyzing ? "Analyzing genomic sequence..." : "Drop FASTA/FASTQ files here"}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {isAnalyzing ? "Please wait, traversing K-mer nodes" : ".fasta · .fastq · .fa · .fq · max 500MB"}
        </p>
      </div>
    </div>
  );
}
