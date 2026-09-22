"use client"

import { useCallback } from "react"
import { X } from "lucide-react"
import type { BaseFieldControlProps } from "../types"
import { ImageInputField } from "./image-input-field"
import { cn } from "../../lib/cn"
import { resolveMediaUrl } from "../../lib/resolve-media-url"

export type GalleryImageUploadFieldProps = BaseFieldControlProps<string[]> & {
    accept?: string
    onUpload: (file: File) => Promise<string>
    maxImages?: number
}

export function GalleryImageUploadField({
    value,
    onChange,
    onBlur,
    name,
    disabled,
    invalid,
    accept = "image/*",
    onUpload,
    maxImages = 10,
}: GalleryImageUploadFieldProps) {
    const urls = value ?? []
    const canAdd = urls.length < maxImages

    const handleRemove = useCallback(
        (index: number) => {
            onChange(urls.filter((_, i) => i !== index))
        },
        [onChange, urls],
    )

    const handleAdd = useCallback(
        (url: string | null) => {
            if (!url) return
            onChange([...urls, url])
        },
        [onChange, urls],
    )

    return (
        <div
            className={cn(invalid && "rounded-md ring-1 ring-destructive")}
            onBlur={onBlur}
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {urls.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-md border border-input bg-muted/30">
                        <img
                            src={resolveMediaUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ))}

                {canAdd && (
                    <ImageInputField
                        name={name}
                        value={null}
                        onChange={handleAdd}
                        onUpload={onUpload}
                        accept={accept}
                        disabled={disabled}
                        invalid={invalid}
                    />
                )}
            </div>
        </div>
    )
}
