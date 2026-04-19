import { Home, Upload, BarChart3, Database, Settings, Dna } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", icon: Home },
  { title: "Upload", icon: Upload },
  { title: "Results", icon: BarChart3 },
  { title: "Database", icon: Database },
  { title: "Settings", icon: Settings },
];

const resistanceGauges = [
  { label: "Ampicillin", level: 85, status: "resistant" as const },
  { label: "Ciprofloxacin", level: 42, status: "intermediate" as const },
  { label: "Meropenem", level: 12, status: "susceptible" as const },
  { label: "Tetracycline", level: 68, status: "intermediate" as const },
];

const statusColor: Record<string, string> = {
  resistant: "bg-destructive",
  intermediate: "bg-warning",
  susceptible: "bg-primary",
};

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Dna className="h-5 w-5 text-primary shrink-0" />
            {!collapsed && (
              <span className="font-display text-sm tracking-wider text-foreground">
                ResistAI
              </span>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton className="text-muted-foreground hover:text-primary hover:bg-accent font-display text-xs">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-display text-[10px] tracking-widest uppercase text-muted-foreground">
              Resistance Gauges
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 space-y-3">
                {resistanceGauges.map((g) => (
                  <div key={g.label}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted-foreground">{g.label}</span>
                      <span className="font-mono text-[10px] text-foreground">{g.level}%</span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${statusColor[g.status]} transition-all duration-700`}
                        style={{ width: `${g.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
