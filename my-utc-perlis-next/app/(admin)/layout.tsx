"use client";

import { useEffect, useState } from "react";
// Import sidebar components
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check system preference
    const checkTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const newTheme = isDark ? 'dark' : 'light';
      setTheme(newTheme);
      
      // Apply theme to document root for portals
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    };

    checkTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => mediaQuery.removeEventListener('change', checkTheme);
  }, []);

  return (
    <div className={`${theme} min-h-screen bg-background`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Apply dark mode to the entire page */
          html, body {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
          }
          
          /* Hide parent navigation and footer in admin section */
          body > nav, 
          body > header,
          body > main > nav,
          body > main > header,
          body > footer,
          body > main > footer {
            display: none;
          }
          
          /* Admin layout positioning */
          body > main {
            min-height: 100vh;
            background-color: hsl(var(--background));
          }
          
          /* Ensure modals appear above admin layout and inherit theme */
          body > [data-radix-portal] {
            z-index: 99999 !important;
          }
          
          /* Apply theme to portals */
          .dark [data-radix-portal] * {
            color-scheme: dark;
          }
          
          .light [data-radix-portal] * {
            color-scheme: light;
          }
        `
      }} />
      
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
} 