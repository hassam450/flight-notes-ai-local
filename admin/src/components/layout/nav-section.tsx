"use client";

import type { NavSection as NavSectionType } from "@/constants/navigation";
import { NavItem } from "./nav-item";

interface NavSectionProps {
  section: NavSectionType;
  collapsed: boolean;
}

export function NavSection({ section, collapsed }: NavSectionProps) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
      )}
      {section.items.map((item) => (
        <NavItem key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}
