import { Upload } from "lucide-react";

export function UploadZone() {
  return (
    <div className="corner-brackets relative border border-dashed border-border rounded-md p-8 text-center overflow-hidden group hover:border-primary/50 transition-colors">
      {/* Scanline effect */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
        <p className="font-display text-sm text-foreground mb-1">
          Drop FASTA/FASTQ files here
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          .fasta · .fastq · .fa · .fq · max 500MB
        </p>
      </div>
    </div>
  );
}
