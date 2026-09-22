"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../shadcn/tabs"
import { RhfTextField } from "./rhf-text-field"

type Props<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName
    label?: string
    required?: boolean
    disabled?: boolean
    placeholder?: { ar?: string; en?: string }
}

export function RhfLocalizedTextField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>({ name, label, required, disabled, placeholder }: Props<TValues, TName>) {
    return (
        <div className="space-y-1.5">
            {label && (
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                    {required && <span className="text-destructive ms-1">*</span>}
                </span>
            )}
            <Tabs defaultValue="ar">
                <TabsList variant="line" className="mb-1">
                    <TabsTrigger value="ar">AR</TabsTrigger>
                    <TabsTrigger value="en">EN</TabsTrigger>
                </TabsList>
                <TabsContent value="ar">
                    <RhfTextField
                        name={`${name}.ar` as TName}
                        required={required}
                        disabled={disabled}
                        placeholder={placeholder?.ar}
                    />
                </TabsContent>
                <TabsContent value="en">
                    <RhfTextField
                        name={`${name}.en` as TName}
                        disabled={disabled}
                        placeholder={placeholder?.en}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
