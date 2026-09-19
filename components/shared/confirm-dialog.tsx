"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    destructive?: boolean;
    resolve?: (v: boolean) => void;
  }>({ open: false, title: "" });

  const confirm = (opts: { title: string; description?: string; destructive?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, ...opts, resolve });
    });
  };

  const ConfirmDialog = (
    <Dialog open={state.open} onOpenChange={(open) => !open && state.resolve?.(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description && <DialogDescription>{state.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setState((s) => ({ ...s, open: false }));
              state.resolve?.(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant={state.destructive ? "destructive" : "default"}
            onClick={() => {
              setState((s) => ({ ...s, open: false }));
              state.resolve?.(true);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
