import { NetworkVisualization } from '@/components/network-visualization';
import { ControlPanel } from '@/components/control-panel';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function Home() {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="sidebar" collapsible="icon">
        <ControlPanel />
      </Sidebar>
      <SidebarInset>
        <div className="flex h-screen w-full items-center justify-center p-4">
          <NetworkVisualization />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
