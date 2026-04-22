import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { PipelineStrip } from "@/components/dashboard/PipelineStrip";
import { MetricsRow } from "@/components/dashboard/MetricsRow";
import { ResistancePredictions } from "@/components/dashboard/ResistancePredictions";
import { SequenceViewer } from "@/components/dashboard/SequenceViewer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Dashboard() {
  const [pipelineStep, setPipelineStep] = useState(2);
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleUpload = async (file: File) => {
    setIsAnalyzing(true);
    setPipelineStep(3); // Start analyze animation or step
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPredictions(data.results);
        setPipelineStep(4); // Finish
      } else {
        alert(data.error);
        setPipelineStep(2);
      }
    } catch (err) {
      alert("API Error: Make sure python api.py is running on port 5000!");
      setPipelineStep(2);
    }
    setIsAnalyzing(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background grid-bg">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-primary" />
            <span className="ml-4 font-display text-xs tracking-widest uppercase text-muted-foreground">
              ResistAI Dashboard
            </span>
            <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isAnalyzing ? 'bg-warning animate-pulse' : 'bg-primary'}`} />
              {isAnalyzing ? 'ANALYZING...' : 'PIPELINE READY'}
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <UploadZone onUpload={handleUpload} isAnalyzing={isAnalyzing} />
            <PipelineStrip currentStep={pipelineStep} onStepClick={setPipelineStep} />
            <MetricsRow />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResistancePredictions predictions={predictions} />
              <SequenceViewer />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
