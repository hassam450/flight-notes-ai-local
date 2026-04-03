import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getUserById } from "@/lib/actions/users";
import { getUserSubscriptionHistory } from "@/lib/actions/subscriptions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { UserProfileHeader } from "@/components/users/user-profile-header";
import { SubscriptionTimeline } from "@/components/users/subscription-timeline";
import { UserAdminActions } from "@/components/users/user-admin-actions";
import {
  FileText,
  GraduationCap,
  MessageSquare,
  Mic,
} from "lucide-react";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  const [result, subscriptionHistory, headersList] = await Promise.all([
    getUserById(id),
    getUserSubscriptionHistory(id),
    headers(),
  ]);

  if (!result) notFound();

  const { user, activity } = result;
  const adminRole = headersList.get("x-admin-role") ?? "viewer";

  return (
    <div className="space-y-6">
      <PageHeader title="User Details" />

      <UserProfileHeader user={user} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Notes" value={activity.notes_count} icon={FileText} />
        <StatCard
          title="Sessions"
          value={activity.sessions_count}
          icon={GraduationCap}
        />
        <StatCard
          title="Chat Threads"
          value={activity.chat_threads_count}
          icon={MessageSquare}
        />
        <StatCard
          title="Recordings"
          value={activity.recordings_count}
          icon={Mic}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SubscriptionTimeline events={subscriptionHistory} />
        </div>
        <div>
          <UserAdminActions user={user} role={adminRole} />
        </div>
      </div>
    </div>
  );
}
