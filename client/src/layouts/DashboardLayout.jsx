import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children }) => (
  <TooltipProvider>
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
);

export default DashboardLayout;
