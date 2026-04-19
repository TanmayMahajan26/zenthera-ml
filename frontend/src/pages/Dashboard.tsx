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
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              PIPELINE ACTIVE
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <UploadZone />
            <PipelineStrip currentStep={pipelineStep} onStepClick={setPipelineStep} />
            <MetricsRow />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResistancePredictions />
              <SequenceViewer />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
