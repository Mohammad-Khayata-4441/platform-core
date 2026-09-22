"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@core/api-client"
import { Button } from "../../shadcn/button"
import { Plus } from "lucide-react"
import { useResourceContext } from "./resource-context"

export type ResourceCreateButtonProps = {
    label?: string
    icon?: ReactNode
    className?: string
}

export function ResourceCreateButton({
    label = "إضافة",
    icon = <Plus />,
    className,
}: ResourceCreateButtonProps) {
    const resource = useResourceContext<ICrudClient>()

    if (!resource.canCreate) return null

    return (
        <Button size="lg" onClick={() => resource.openCreate()} className={className}>
            {icon}
            {label}
        </Button>
    )
}
