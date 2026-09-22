"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "../../lib/cn"
import { Button } from "../../shadcn/button"
import { Calendar } from "../../shadcn/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../shadcn/popover"
import type { BaseFieldControlProps } from "../types"

export type DatePickerFieldProps = BaseFieldControlProps<string> & {
    placeholder?: string
}

export function DatePickerField({
    value,
    onChange,
    onBlur,
    disabled,
    invalid,
    placeholder = "Pick a date",
}: DatePickerFieldProps) {
    const dateValue = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    const isValidDate = dateValue ? isValid(dateValue) : false

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    disabled={disabled}
                    onBlur={onBlur}
                    aria-invalid={invalid || undefined}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !isValidDate && "text-muted-foreground",
                        invalid && "border-destructive ring-3 ring-destructive/20",
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {isValidDate ? format(dateValue!, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={isValidDate ? dateValue : undefined}
                    onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    )
}
