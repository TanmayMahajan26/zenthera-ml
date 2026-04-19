const sampleSequence = "ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGA";

const baseColor: Record<string, string> = {
  A: "text-primary",
  T: "text-destructive",
  G: "text-warning",
  C: "text-info",
};

const kmerData = [
  ["ATG", 42], ["GCG", 38], ["CGA", 35], ["TCG", 31],
  ["GAT", 28], ["ATC", 26], ["CGC", 24], ["TGA", 21],
  ["GCA", 19], ["TAT", 17], ["ACG", 15], ["CTG", 12],
] as const;

export function SequenceViewer() {
  return (
    <div className="border border-border rounded-md bg-card p-5 space-y-5">
      {/* Sequence display */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xs tracking-widest uppercase text-muted-foreground">
            DNA Sequence Viewer
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground">
            {sampleSequence.length} bp
          </span>
        </div>
        <div className="bg-background border border-border rounded p-3 font-mono text-xs leading-relaxed break-all">
          {sampleSequence.split("").map((base, i) => (
            <span key={i} className={baseColor[base] || "text-foreground"}>
              {base}
            </span>
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          {Object.entries(baseColor).map(([base, color]) => (
            <span key={base} className={`font-mono text-[10px] ${color}`}>
              ● {base}
            </span>
          ))}
        </div>
      </div>

      {/* K-mer frequency grid */}
      <div>
        <h3 className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-3">
          K-mer Frequency
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {kmerData.map(([kmer, freq]) => (
            <div key={kmer} className="border border-border rounded p-2 text-center bg-background">
              <span className="font-mono text-xs text-foreground block">{kmer}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{freq}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
