"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { useTranslations } from "../../lib/i18n"
import { Input } from "../../shadcn/input"
import { Button } from "../../shadcn/button"
import { IconTooltip } from "../../components/icon-tooltip"
import { cn } from "../../lib/cn"
import { useResourceContext } from "./resource-context"

export type ResourceSearchProps = {
    placeholder?: string
    debounceMs?: number
    className?: string
}

export function ResourceSearch({
    placeholder,
    debounceMs = 300,
    className,
}: ResourceSearchProps) {
    const t = useTranslations("system.resourceSearch")
    const { params, handleChange } = useResourceContext()
    const [value, setValue] = useState(params.search ?? "")

    useEffect(() => {
        setValue(params.search ?? "")
    }, [params.search])

    useEffect(() => {
        const timer = setTimeout(() => {
            const normalized = value.trim()
            const current = params.search ?? ""
            if (normalized !== current) {
                handleChange({ type: "search", search: normalized || null })
            }
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [value, debounceMs, handleChange, params.search])

    return (
        <div
            data-slot="resource-search"
            className={cn("group relative w-full", className)}
        >
            <Search
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder ?? t("placeholder")}
                className={cn(
                    "h-10 border-border/80 bg-background ps-9 shadow-sm",
                    value ? "pe-9" : "pe-3",
                    "transition-[border-color,box-shadow]",
                    "focus-visible:border-primary/40 focus-visible:ring-primary/15",
                )}
            />
            {value && (
                <IconTooltip label={t("clear")} side="top">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute end-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={t("clear")}
                        onClick={() => setValue("")}
                    >
                        <X className="size-3.5" />
                    </Button>
                </IconTooltip>
            )}
        </div>
    )
}
