"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { suspendUser, reactivateUser, deleteUser } from "@/lib/actions/users";
import type { AdminUserView } from "@/types/user";
import { Ban, ShieldCheck, Trash2 } from "lucide-react";

interface UserAdminActionsProps {
  user: AdminUserView;
  role: string;
}

type ActionType = "suspend" | "reactivate" | "delete" | null;

export function UserAdminActions({ user, role }: UserAdminActionsProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const isViewer = role === "viewer";

  async function handleConfirm() {
    if (!activeAction) return;
    setLoading(true);

    try {
      let result;
      switch (activeAction) {
        case "suspend":
          result = await suspendUser(user.id);
          break;
        case "reactivate":
          result = await reactivateUser(user.id);
          break;
        case "delete":
          result = await deleteUser(user.id);
          break;
      }

      if (result?.success) {
        if (activeAction === "delete") {
          router.push("/users");
        } else {
          router.refresh();
        }
      } else {
        console.error("Action failed:", result?.error);
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  function ActionButton({
    action,
    label,
    icon: Icon,
    variant = "outline",
  }: {
    action: ActionType;
    label: string;
    icon: React.ElementType;
    variant?: "outline" | "destructive";
  }) {
    if (isViewer) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={<span className="w-full block" />}
          >
            <Button variant={variant} className="w-full" disabled>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only super admins can perform this action</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Button
        variant={variant}
        className="w-full"
        onClick={() => setActiveAction(action)}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.is_banned ? (
            <ActionButton
              action="reactivate"
              label="Reactivate User"
              icon={ShieldCheck}
            />
          ) : (
            <ActionButton
              action="suspend"
              label="Suspend User"
              icon={Ban}
            />
          )}
          <ActionButton
            action="delete"
            label="Delete User"
            icon={Trash2}
            variant="destructive"
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={activeAction === "suspend"}
        onOpenChange={(open) => !open && setActiveAction(null)}
        title="Suspend User"
        description={`Are you sure you want to suspend ${user.email}? They will be unable to sign in until reactivated.`}
        confirmLabel="Suspend"
        variant="destructive"
        loading={loading}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={activeAction === "reactivate"}
        onOpenChange={(open) => !open && setActiveAction(null)}
        title="Reactivate User"
        description={`Are you sure you want to reactivate ${user.email}? They will regain access to the app.`}
        confirmLabel="Reactivate"
        loading={loading}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={activeAction === "delete"}
        onOpenChange={(open) => !open && setActiveAction(null)}
        title="Delete User"
        description={`Are you sure you want to permanently delete ${user.email}? This action cannot be undone and all associated data will be removed.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={loading}
        onConfirm={handleConfirm}
      />
    </>
  );
}
