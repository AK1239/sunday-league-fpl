"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, startTransition } from "react";
import {
  deleteManagerUserAction,
  setManagerStatusAction,
} from "@/server/actions/admin-users";
import type { AdminManagerRow } from "@/server/queries/admin-managers";
import type { ActionResult } from "@/server/actions/action-result";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function statusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return setManagerStatusAction(formData);
}

async function deleteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return deleteManagerUserAction(formData);
}

export function AdminManagersPanel({
  managers,
  currentUserId,
}: {
  managers: AdminManagerRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [statusState, statusForm, statusPending] = useActionState(
    statusAction,
    null,
  );
  useActionResultToast(statusState, "Manager updated");

  const [deleteState, deleteForm, deletePending] = useActionState(
    deleteAction,
    null,
  );
  useActionResultToast(deleteState, "Manager removed");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pendingDelete =
    deletePending && confirmDeleteId ? confirmDeleteId : null;

  useEffect(() => {
    if (statusState?.ok === true || deleteState?.ok === true) {
      router.refresh();
    }
  }, [statusState, deleteState, router]);

  return (
    <div className="space-y-6">
      <div
        className="surface divide-y divide-border/40 overflow-hidden rounded-2xl"
        role="region"
        aria-label="Manager accounts"
      >
        {managers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No manager accounts yet.
          </p>
        ) : (
          <ul>
            {managers.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{m.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.email}
                    </p>
                    {m.teamName ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Team: {m.teamName}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[0.65rem] text-muted-foreground tabular-nums">
                      Joined {m.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        m.status === "active"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {m.status === "active" ? "Active" : "Disabled"}
                    </span>
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground">
                        (you)
                      </span>
                    ) : (
                      <>
                        <form action={statusForm}>
                          <input type="hidden" name="userId" value={m.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={
                              m.status === "active" ? "disabled" : "active"
                            }
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={statusPending}
                          >
                            {m.status === "active" ? "Disable" : "Enable"}
                          </Button>
                        </form>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletePending}
                          onClick={() => setConfirmDeleteId(m.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId != null}
        title="Delete manager account?"
        description="This removes the account and related data (teams, transfers, scores). You cannot undo this. Season awards where they were named manager may be cleared."
        confirmLabel="Delete"
        destructive
        pending={pendingDelete != null}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          const fd = new FormData();
          fd.set("userId", id);
          startTransition(() => {
            deleteForm(fd);
          });
        }}
      />
    </div>
  );
}
