import { Check } from "lucide-react";

const steps = [
  "Upload",
  "QC & Trim",
  "Assembly",
  "Gene Detection",
  "Prediction",
];

interface Props {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function PipelineStrip({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(i)}
              className={`flex items-center gap-2 px-3 py-2 w-full border transition-colors font-display text-[10px] tracking-wider uppercase
                ${done ? "border-primary/30 bg-primary/5 text-primary" : ""}
                ${active ? "border-primary bg-primary/10 text-primary" : ""}
                ${!done && !active ? "border-border text-muted-foreground" : ""}
                ${i === 0 ? "rounded-l-md" : ""} ${i === steps.length - 1 ? "rounded-r-md" : ""}
              `}
            >
              <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[9px] shrink-0
                ${done ? "bg-primary text-primary-foreground" : ""}
                ${active ? "border border-primary text-primary" : ""}
                ${!done && !active ? "border border-border text-muted-foreground" : ""}
              `}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{step}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
