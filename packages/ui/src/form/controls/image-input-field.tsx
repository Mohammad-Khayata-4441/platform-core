"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { ImagePlus, X } from "lucide-react"
import { toast } from "sonner"
import type { BaseFieldControlProps } from "../types"
import { cn } from "../../lib/cn"
import { resolveMediaUrl } from "../../lib/resolve-media-url"
import { Spinner } from "../../shadcn/spinner"

export type ImageInputFieldProps = BaseFieldControlProps<string | null> & {
    accept?: string
    onUpload: (file: File) => Promise<string>
}

export function ImageInputField({
    value,
    onChange,
    onBlur,
    name,
    disabled,
    invalid,
    accept = "image/*",
    onUpload,
}: ImageInputFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        setPreview(value ?? null)
    }, [value])

    const handleFile = useCallback(
        async (file: File | null) => {
            if (!file || !file.type.startsWith("image/")) return

            const blobUrl = URL.createObjectURL(file)
            setPreview(blobUrl)

            try {
                setIsUploading(true)
                const url = await onUpload(file)
                onChange(url)
            } catch {
                setPreview(value ?? null)
                toast.error("Image upload failed")
            } finally {
                setIsUploading(false)
                URL.revokeObjectURL(blobUrl)
                setPreview(value ?? null)
            }
        },
        [onChange, onUpload, value],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            if (disabled || isUploading) return
            const file = e.dataTransfer.files?.[0] ?? null
            void handleFile(file)
        },
        [disabled, handleFile, isUploading],
    )

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            if (!disabled && !isUploading) setIsDragging(true)
        },
        [disabled, isUploading],
    )

    const handleDragLeave = useCallback(() => setIsDragging(false), [])

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onChange(null)
            if (inputRef.current) inputRef.current.value = ""
        },
        [onChange],
    )

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && !isUploading && inputRef.current?.click()}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    if (!isUploading) inputRef.current?.click()
                }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            className={cn(
                "relative flex min-h-35 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background p-4 text-sm transition-colors",
                isDragging && "border-primary bg-primary/5",
                invalid && "border-destructive",
                (disabled || isUploading) && "pointer-events-none opacity-50",
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                name={name}
                disabled={disabled || isUploading}
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />

            {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                    <Spinner className="size-6" />
                </div>
            )}

            {preview ? (
                <>
                    <img
                        src={resolveMediaUrl(preview)}
                        alt="Preview"
                        className="max-h-30 max-w-full rounded-md object-contain"
                    />
                    {!disabled && !isUploading && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </>
            ) : (
                <>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                        Click or drag & drop an image
                    </span>
                </>
            )}
        </div>
    )
}
