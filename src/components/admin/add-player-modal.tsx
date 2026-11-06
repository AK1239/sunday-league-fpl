"use client";

import { BottomSheet } from "@/components/pick/bottom-sheet";
import { CreatePlayerForm } from "@/components/admin/create-player-form";

export function AddPlayerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Add player"
      description="Register a new squad member"
    >
      <CreatePlayerForm onSuccess={onClose} />
    </BottomSheet>
  );
}
