"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Plus, Search, FilePlus2, Sparkles, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md transition-colors">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-9 w-9 rounded-md border border-border hover:bg-muted cursor-pointer" />
        <div className="hidden sm:flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-semibold text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 py-0.5 rounded-md"
          >
            FY 2026-27
          </Badge>
          <span className="text-xs text-muted-foreground font-normal">
            Prefix: <strong className="text-foreground font-semibold">MTJ/</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          asChild
          className="h-9 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs transition-all active:scale-[0.98]"
        >
          <Link href="/invoices/new" className="flex items-center gap-2 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            <span>New Bill</span>
          </Link>
        </Button>

        <ThemeToggle />
      </div>

    </header>
  );
}
