"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Plus, Save } from "lucide-react"
import { useTranslations } from "../lib/i18n"
import type { FieldValues } from "react-hook-form"
import type { ResourceFormController } from "../hooks/use-resource-form-controller"
import { Alert, AlertTitle } from "../shadcn/alert"
import { Button } from "../shadcn/button"
import { FieldGroup } from "../shadcn/field"
import { Rhform } from "./rhform"

export type ResourceFormShellProps<TValues extends FieldValues> = {
    ctrl: ResourceFormController<TValues>
    children: ReactNode
}

/**
 * Renders the shared scaffolding around a resource form: the RHF form element,
 * a destructive error alert, the field group, and the submit button. Callers
 * provide only the entity-specific fields as `children`.
 */
export function ResourceFormShell<TValues extends FieldValues>({
    ctrl,
    children,
}: ResourceFormShellProps<TValues>) {
    const t = useTranslations("system.resourceForm")
    const { form, isEditing, isBusy, error, entityLabel, onSubmit } = ctrl

    return (
        <Rhform form={form} onSubmit={onSubmit}>
            {error && (
                <FormErrorAlert
                    title={isEditing
                        ? t("updateFailed", { entity: entityLabel })
                        : t("createFailed", { entity: entityLabel })}
                    message={error.message}
                />
            )}
            <FieldGroup>
                {children}
                <FormSubmitButton isEditing={isEditing} isBusy={isBusy} entityLabel={entityLabel} />
            </FieldGroup>
        </Rhform>
    )
}

function FormErrorAlert({ title, message }: { title: string; message: string }) {
    return (
        <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="me-2 h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            {message}
        </Alert>
    )
}

function FormSubmitButton({
    isEditing,
    isBusy,
    entityLabel,
}: {
    isEditing: boolean
    isBusy: boolean
    entityLabel: string
}) {
    const t = useTranslations("system.resourceForm")
    const label = isBusy
        ? (isEditing ? t("updating") : t("creating"))
        : (isEditing ? t("update", { entity: entityLabel }) : t("create", { entity: entityLabel }))

    return (
        <Button type="submit" variant="default" disabled={isBusy}>
            {isEditing ? <Save /> : <Plus />}
            {label}
        </Button>
    )
}
