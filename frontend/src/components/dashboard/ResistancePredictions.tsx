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

export function ResistancePredictions({ predictions }: { predictions?: any[] | null }) {
  const displayPreds = predictions && predictions.length > 0 ? predictions.map(p => ({
    antibiotic: p.antibiotic,
    probability: p.prediction === "Susceptible" ? p.susceptible_confidence : p.resistant_confidence,
    status: p.prediction.toLowerCase(),
  })) : [
    { antibiotic: "Waiting for Input...", probability: 0, status: "intermediate" }
  ];

  return (
    <div className="border border-border rounded-md bg-card p-5">
      <h3 className="font-display text-xs tracking-widest uppercase text-muted-foreground mb-4">
        ML Resistance Predictions
      </h3>
      <div className="space-y-3">
        {displayPreds.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="font-mono text-xs text-foreground w-28 shrink-0">{p.antibiotic}</span>
            <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor[p.status] || barColor.intermediate} transition-all duration-700`}
                style={{ width: `${p.probability * 100}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">
              {(p.probability * 100).toFixed(0)}%
            </span>
            <span className={`font-display text-[9px] tracking-wider uppercase px-2 py-0.5 rounded border ${chipClass[p.status] || chipClass.intermediate}`}>
              {p.status.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
