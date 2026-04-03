import { Suspense } from "react";
import { getUsers } from "@/lib/actions/users";
import { PageHeader } from "@/components/shared/page-header";
import { UserDataTable } from "@/components/users/user-data-table";
import { ExportCsvButton } from "@/components/users/export-csv-button";
import { Skeleton } from "@/components/ui/skeleton";

interface UsersPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 25;

  const result = await getUsers({
    page,
    pageSize,
    search: params.search,
    provider: params.provider,
    sortBy: params.sortBy,
    sortOrder: (params.sortOrder as "asc" | "desc") ?? "asc",
  });

  return (
    <div className="space-y-6">
      <PageHeader title="User Directory" description="Manage all app users">
        <ExportCsvButton />
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
        <UserDataTable
          data={result.data}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
        />
      </Suspense>
    </div>
  );
}
