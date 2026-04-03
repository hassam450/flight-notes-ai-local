"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { navigation, type NavItem as NavItemType } from "@/constants/navigation";

// Collect all nav hrefs to avoid false-positive startsWith matches
const allNavHrefs = new Set(
  navigation.flatMap((s) => s.items.map((i) => i.href))
);

interface NavItemProps {
  item: NavItemType;
  collapsed: boolean;
}

export function NavItem({ item, collapsed }: NavItemProps) {
  const pathname = usePathname();
  // Exact match always wins. Only fall back to startsWith for sub-pages
  // (e.g. /users/[id]) that aren't themselves a nav item.
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href ||
        (pathname.startsWith(item.href + "/") && !allNavHrefs.has(pathname));

  const linkClasses = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
    collapsed && "justify-center px-2",
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link href={item.href} className={linkClasses}>
              <item.icon className="h-4 w-4 shrink-0" />
            </Link>
          }
        />
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} className={linkClasses}>
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.title}</span>
    </Link>
  );
}
