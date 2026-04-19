import { Activity, Dna, Shield, Clock } from "lucide-react";

const metrics = [
  { label: "Sequences Analyzed", value: "1,247", icon: Dna, change: "+23%" },
  { label: "Resistance Genes", value: "34", icon: Shield, change: "+5" },
  { label: "Avg. Confidence", value: "94.2%", icon: Activity, change: "+1.3%" },
  { label: "Processing Time", value: "2.4s", icon: Clock, change: "-0.3s" },
];

export function MetricsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="border border-border rounded-md p-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <m.icon className="h-4 w-4 text-primary" />
            <span className="font-mono text-[10px] text-primary">{m.change}</span>
          </div>
          <p className="font-display text-xl text-foreground">{m.value}</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
