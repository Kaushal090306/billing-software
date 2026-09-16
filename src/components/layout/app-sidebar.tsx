"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  ScanLine,
  BarChart3,
  Settings,
  Sparkles,
  Building2,
  Phone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: FileText,
    },
    {
      title: "Customers & Ledgers",
      href: "/customers",
      icon: Users,
    },
    {
      title: "Product Master",
      href: "/products",
      icon: Package,
    },
    {
      title: "Payments & Udhar",
      href: "/payments",
      icon: CreditCard,
    },
    {
      title: "AI Bill Scanner",
      href: "/ai-scanner",
      icon: ScanLine,
      badge: "OCR",
    },
    {
      title: "Reports & GST",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  const footerItems = [
    {
      title: "Settings & Backup",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar"
    >
      <SidebarHeader className="px-5 py-5 group-data-[collapsible=icon]:p-2 bg-sidebar">
        <Link
          href="/dashboard"
          className="flex flex-col group-data-[collapsible=icon]:items-center"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card border border-border shadow-xs">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#9B5CF6" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#9B5CF6" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#9B5CF6" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#7C3AED" />
              </svg>
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
              <span className="text-[14px] font-bold text-foreground tracking-tight leading-tight truncate">
                DHARMI THREAD
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
                &amp; JARI BILLING
              </span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-3 space-y-1">
        <SidebarGroup className="px-0 py-2">
          <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 px-3 mb-2">
            MAIN MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href) &&
                    (pathname[item.href.length] === "/" ||
                      pathname.length === item.href.length));
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`h-10 px-3 rounded-md transition-all font-medium text-[13px] ${
                        isActive
                          ? "bg-white dark:bg-[#27272a] text-[#09090b] dark:text-white shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-[#f4f4f5] dark:hover:bg-[#181922]"
                      }`}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? "text-purple-600 dark:text-purple-400"
                                : ""
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.badge && !isCollapsed && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] h-5 px-1.5 font-medium rounded-md ${
                              item.badge === "Fast"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar px-3 py-3 border-t border-border">
        <SidebarMenu className="space-y-1">
          {footerItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="h-9 px-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted text-[13px]"
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {!isCollapsed && (
          <div className="mt-2 p-3 rounded-md bg-card border border-border text-[11px] text-muted-foreground space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Dharmi Thread & Jari</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              GST: 24AGQPT2491L1ZO
            </div>
            <div className="text-[10px] text-muted-foreground/80 truncate">
              Surat, Gujarat
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
