"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-md text-[#71717a] dark:text-[#a1a1aa] border border-transparent"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 text-amber-500" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all cursor-pointer flex items-center justify-center"
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      aria-label="Toggle theme"
    >
      <Sun className={`h-4 w-4 text-amber-500 transition-all duration-300 ${isDark ? "rotate-90 scale-0 hidden" : "rotate-0 scale-100 block"}`} />
      <Moon className={`h-4 w-4 text-purple-500 transition-all duration-300 ${isDark ? "rotate-0 scale-100 block" : "-rotate-90 scale-0 hidden"}`} />
    </Button>
  );
}
