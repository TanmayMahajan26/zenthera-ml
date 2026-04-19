const predictions = [
  { antibiotic: "Ampicillin", probability: 0.92, status: "resistant" },
  { antibiotic: "Ciprofloxacin", probability: 0.45, status: "intermediate" },
  { antibiotic: "Meropenem", probability: 0.08, status: "susceptible" },
  { antibiotic: "Tetracycline", probability: 0.71, status: "intermediate" },
  { antibiotic: "Gentamicin", probability: 0.88, status: "resistant" },
  { antibiotic: "Colistin", probability: 0.15, status: "susceptible" },
];

const chipClass: Record<string, string> = {
  resistant: "bg-destructive/15 text-destructive border-destructive/30",
  intermediate: "bg-warning/15 text-warning border-warning/30",
  susceptible: "bg-primary/15 text-primary border-primary/30",
};

const barColor: Record<string, string> = {
  resistant: "bg-destructive",
  intermediate: "bg-warning",
  susceptible: "bg-primary",
};

export function ResistancePredictions() {
  return (
    <div className="border border-border rounded-md bg-card p-5">
      <h3 className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-4">
        ML Resistance Predictions
      </h3>
      <div className="space-y-3">
        {predictions.map((p) => (
          <div key={p.antibiotic} className="flex items-center gap-3">
            <span className="font-mono text-xs text-foreground w-28 shrink-0">{p.antibiotic}</span>
            <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor[p.status]} transition-all duration-700`}
                style={{ width: `${p.probability * 100}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">
              {(p.probability * 100).toFixed(0)}%
            </span>
            <span className={`font-display text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border ${chipClass[p.status]}`}>
              {p.status.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
