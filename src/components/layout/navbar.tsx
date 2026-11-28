"use client";

import * as React from "react";
import Link from "next/link";
import { Wind, Menu, X, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useEscapeKey } from "@/hooks/use-dismissable";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  useEscapeKey(mobileMenuOpen, () => setMobileMenuOpen(false));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-emerald-950/70 bg-white/90 dark:bg-forest-950/90 backdrop-blur-md transition-colors">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg p-1"
          aria-label="BreatheWise AI Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm transition-transform group-hover:scale-105 dark:bg-emerald-600">
            <Wind className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg leading-tight font-extrabold tracking-tight bg-gradient-to-r from-emerald-900 via-emerald-700 to-forest-800 dark:from-emerald-300 dark:to-emerald-100 bg-clip-text text-transparent">
              BreatheWise<span className="text-emerald-600 dark:text-emerald-400"> AI</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700 dark:text-slate-200"
          aria-label="Main Navigation"
        >
          {siteConfig.navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded px-1.5 py-1"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "font-medium text-slate-700 dark:text-slate-200"
            )}
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-sm gap-1.5"
            )}
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation menu"
            className="w-9 h-9"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-slate-800 dark:text-slate-200" />
            ) : (
              <Menu className="h-5 w-5 text-slate-800 dark:text-slate-200" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden border-b border-slate-200 dark:border-emerald-950 bg-white/98 dark:bg-forest-950/98 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2"
          role="region"
          aria-label="Mobile Navigation"
        >
          <div className="flex flex-col space-y-2">
            {siteConfig.navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-base font-medium text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-emerald-900/60 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(buttonVariants(), "w-full justify-center bg-emerald-700 text-white gap-2")}
            >
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

