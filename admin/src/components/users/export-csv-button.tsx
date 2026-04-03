"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAllUsersForExport } from "@/lib/actions/users";
import { Download } from "lucide-react";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const users = await getAllUsersForExport();

      const headers = [
        "ID",
        "Email",
        "Full Name",
        "Provider",
        "Created At",
        "Last Sign In",
        "Notes Count",
        "Sessions Count",
        "Subscription",
        "Banned",
      ];

      const rows = users.map((u) => [
        u.id,
        u.email,
        u.full_name ?? "",
        u.provider,
        u.created_at,
        u.last_sign_in_at ?? "",
        String(u.notes_count),
        String(u.sessions_count),
        u.subscription_tier,
        String(u.is_banned),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              cell.includes(",") || cell.includes('"')
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
