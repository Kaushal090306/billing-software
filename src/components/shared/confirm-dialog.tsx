"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "destructive" | "default"
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader className="flex flex-row items-start gap-3 text-left">
          {variant === "destructive" && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-normal">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
