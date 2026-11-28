"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsClient, useThemePreference } from "@/hooks/use-stored-state";

export function ThemeToggle() {
  const [theme, setTheme] = useThemePreference();
  const mounted = useIsClient();

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 rounded-lg"
        aria-label="Toggle visual theme"
        disabled
      >
        <Sun className="h-4 w-4 text-muted-foreground opacity-50" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg transition-transform hover:scale-105 active:scale-95"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-emerald-900 transition-all" />
      ) : (
        <Sun className="h-4 w-4 text-amber-300 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

