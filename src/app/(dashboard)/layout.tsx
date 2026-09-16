import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main
          suppressHydrationWarning
          className="flex-1 overflow-auto p-4 sm:p-6 bg-background min-h-screen transition-colors"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
