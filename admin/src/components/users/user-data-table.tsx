"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type ColumnDef,
  type DataTableFilter,
} from "@/components/shared/data-table";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { AdminUserView } from "@/types/user";
import { SubscriptionTier } from "@/types/subscription";
import { ExternalLink } from "lucide-react";

interface UserDataTableProps {
  data: AdminUserView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const providerFilter: DataTableFilter = {
  key: "provider",
  label: "Provider",
  options: [
    { label: "Google", value: "google" },
    { label: "Apple", value: "apple" },
    { label: "Email", value: "email" },
  ],
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0]?.toUpperCase() ?? "?";
}

function ProviderBadge({ provider }: { provider: string }) {
  const variant =
    provider === "google"
      ? "secondary"
      : provider === "apple"
        ? "outline"
        : "default";
  return (
    <Badge variant={variant}>
      {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </Badge>
  );
}

function SubscriptionBadge({ tier }: { tier: SubscriptionTier }) {
  return (
    <Badge variant={tier === SubscriptionTier.Premium ? "default" : "secondary"}>
      {tier === SubscriptionTier.Premium ? "Premium" : "Free"}
    </Badge>
  );
}

const columns: ColumnDef<AdminUserView>[] = [
  {
    key: "name",
    header: "User",
    render: (user) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(user.full_name, user.email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium leading-tight">
            {user.full_name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "provider",
    header: "Provider",
    render: (user) => <ProviderBadge provider={user.provider} />,
  },
  {
    key: "subscription_tier",
    header: "Plan",
    render: (user) => <SubscriptionBadge tier={user.subscription_tier} />,
  },
  {
    key: "notes_count",
    header: "Notes",
    sortable: true,
    render: (user) => (
      <span className="tabular-nums">{user.notes_count}</span>
    ),
  },
  {
    key: "sessions_count",
    header: "Sessions",
    sortable: true,
    render: (user) => (
      <span className="tabular-nums">{user.sessions_count}</span>
    ),
  },
  {
    key: "created_at",
    header: "Joined",
    sortable: true,
    render: (user) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(user.created_at)}
      </span>
    ),
  },
  {
    key: "last_sign_in_at",
    header: "Last Active",
    sortable: true,
    render: (user) => (
      <span className="text-sm text-muted-foreground">
        {formatRelativeTime(user.last_sign_in_at)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    render: (user) => (
      <Link
        href={`/users/${user.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        View <ExternalLink className="h-3 w-3" />
      </Link>
    ),
  },
];

export function UserDataTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
}: UserDataTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      searchPlaceholder="Search by name or email..."
      filters={[providerFilter]}
      keyExtractor={(user) => user.id}
    />
  );
}
