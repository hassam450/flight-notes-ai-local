import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { AdminUserView } from "@/types/user";
import { SubscriptionTier } from "@/types/subscription";

interface UserProfileHeaderProps {
  user: AdminUserView;
}

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

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">
              {getInitials(user.full_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                {user.full_name ?? "No Name"}
              </h2>
              {user.is_banned && (
                <Badge variant="destructive">Suspended</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline">
                {user.provider.charAt(0).toUpperCase() +
                  user.provider.slice(1)}
              </Badge>
              <Badge
                variant={
                  user.subscription_tier === SubscriptionTier.Premium
                    ? "default"
                    : "secondary"
                }
              >
                {user.subscription_tier === SubscriptionTier.Premium
                  ? "Premium"
                  : "Free"}
              </Badge>
            </div>
          </div>
          <div className="hidden text-right text-sm text-muted-foreground sm:block">
            <p>Joined {formatDate(user.created_at)}</p>
            <p>Last active {formatRelativeTime(user.last_sign_in_at)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
