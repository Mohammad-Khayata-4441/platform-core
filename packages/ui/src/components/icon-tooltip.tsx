"use client"

import type { ReactElement } from "react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "../shadcn/tooltip"
import { cn } from "../lib/cn"

export type IconTooltipProps = {
    label: string
    children: ReactElement
    side?: "top" | "right" | "bottom" | "left"
    sideOffset?: number
    className?: string
    disabled?: boolean
}

export function IconTooltip({
    label,
    children,
    side = "top",
    sideOffset = 4,
    className,
    disabled = false,
}: IconTooltipProps) {
    if (disabled) {
        return children
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side={side}
                sideOffset={sideOffset}
                className={cn(className)}
            >
                {label}
            </TooltipContent>
        </Tooltip>
    )
}
