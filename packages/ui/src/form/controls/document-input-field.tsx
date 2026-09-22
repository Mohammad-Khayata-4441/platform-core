"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { FileUp, X, FileText, FileImage, FileSpreadsheet, File } from "lucide-react"
import type { BaseFieldControlProps } from "../types"
import { cn } from "../../lib/cn"

export type DocumentInputFieldProps = BaseFieldControlProps<File | null> & {
    accept?: string
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]

function getFileIcon(file: File) {
    if (IMAGE_TYPES.includes(file.type)) return FileImage
    if (file.type === "application/pdf") return FileText
    if (
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "text/csv"
    ) return FileSpreadsheet
    return File
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentInputField({
    value,
    onChange,
    onBlur,
    name,
    disabled,
    invalid,
    accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt",
}: DocumentInputFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const isImage = value && IMAGE_TYPES.includes(value.type)

    useEffect(() => {
        if (!value || !isImage) {
            setPreview(null)
            return
        }
        const url = URL.createObjectURL(value)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [value, isImage])

    const handleFile = useCallback(
        (file: File | null) => {
            onChange(file)
        },
        [onChange],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            if (disabled) return
            const file = e.dataTransfer.files?.[0] ?? null
            handleFile(file)
        },
        [disabled, handleFile],
    )

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
        },
        [disabled],
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

    const FileIcon = value ? getFileIcon(value) : FileUp

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    inputRef.current?.click()
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
                disabled && "pointer-events-none opacity-50",
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                name={name}
                disabled={disabled}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {value ? (
                <>
                    {isImage && preview ? (
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-30 max-w-full rounded-md object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1.5">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                            <span className="max-w-48 truncate font-medium text-foreground">
                                {value.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatFileSize(value.size)}
                            </span>
                        </div>
                    )}
                    {!disabled && (
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
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                        Click or drag & drop a file
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Images, PDF, Word, Excel, CSV, or text files
                    </span>
                </>
            )}
        </div>
    )
}
