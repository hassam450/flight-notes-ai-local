"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const ranges = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

export function UsageTimeRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") ?? "30";

  function handleChange(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", String(days));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <Button
          key={r.days}
          variant={Number(currentRange) === r.days ? "default" : "outline"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => handleChange(r.days)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
