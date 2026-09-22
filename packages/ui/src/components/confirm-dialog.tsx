"use client"

import { create } from "zustand"
import { Trash2 } from "lucide-react"
import { useTranslations } from "../lib/i18n"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "../shadcn/alert-dialog"

// ── Types ──

export type ConfirmOptions = {
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "destructive" | "default"
}

type ConfirmStore = {
    open: boolean
    options: ConfirmOptions
    resolve: ((value: boolean) => void) | null
    _show: (options: ConfirmOptions) => Promise<boolean>
    _close: (confirmed: boolean) => void
}

// ── Store ──

const useConfirmStore = create<ConfirmStore>((set, get) => ({
    open: false,
    options: {},
    resolve: null,
    _show: (options) =>
        new Promise<boolean>((resolve) => {
            set({ open: true, options, resolve })
        }),
    _close: (confirmed) => {
        const { resolve } = get()
        resolve?.(confirmed)
        set({ open: false, resolve: null })
    },
}))

// ── Imperative API (usage: `await confirm({ ... })`) ──

export function confirm(options: ConfirmOptions = {}) {
    if (process.env.NODE_ENV === "development") {
        const state = useConfirmStore.getState()
        if (state.open) {
            console.warn("[ConfirmDialog] A confirm dialog is already open. Nested confirms are not supported.")
        }
        // Detect missing <ConfirmDialog /> mount: if `resolve` is never set after a tick, the dialog component is not mounted.
        const result = state._show(options)
        setTimeout(() => {
            const current = useConfirmStore.getState()
            if (current.open && current.resolve === null) {
                console.warn(
                    "[ConfirmDialog] confirm() was called but <ConfirmDialog /> does not appear to be mounted. " +
                    "Make sure <ConfirmDialog /> is rendered in your root layout.",
                )
            }
        }, 100)
        return result
    }
    return useConfirmStore.getState()._show(options)
}

// ── Dialog component (mount once in the root layout) ──

export function ConfirmDialog() {
    const { open, options, _close } = useConfirmStore()
    const t = useTranslations("system.confirm")

    const isDestructive = options.variant === "destructive"

    return (
        <AlertDialog
            open={open}
            onOpenChange={(v) => {
                if (!v) _close(false)
            }}
        >
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    {isDestructive && (
                        <AlertDialogMedia>
                            <Trash2 className="text-destructive" />
                        </AlertDialogMedia>
                    )}
                    <AlertDialogTitle>
                        {options.title ?? t("title")}
                    </AlertDialogTitle>
                    {options.description && (
                        <AlertDialogDescription>
                            {options.description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => _close(false)}>
                        {options.cancelLabel ?? t("cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={isDestructive ? "destructive" : "default"}
                        onClick={() => _close(true)}
                    >
                        {options.confirmLabel ?? t("confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
