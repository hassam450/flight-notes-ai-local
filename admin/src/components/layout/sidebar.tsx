"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/constants/navigation";
import { NavSection } from "./nav-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, PanelLeftClose, PanelLeft, Plane } from "lucide-react";

const COLLAPSED_KEY = "admin-sidebar-collapsed";

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Plane className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <>
            <span className="text-sm font-semibold">Flight Notes</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Admin
            </Badge>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {navigation.map((section, i) => (
          <div key={section.title}>
            {i > 0 && <Separator className="mb-4" />}
            <NavSection section={section} collapsed={collapsed} />
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden border-r border-border bg-sidebar transition-all duration-200 md:flex md:flex-col",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-3 top-3 z-40 md:hidden"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
