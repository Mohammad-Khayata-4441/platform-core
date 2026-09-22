"use client"

import { useTranslations } from "../lib/i18n"
import { toast } from "sonner"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"
import type { QueryKey } from "@tanstack/react-query"
import type { ZodType } from "zod"
import type { ICrudClient } from "@core/api-client"
import { useFormDialog } from "../form/form-dialog"
import { useApi } from "@core/api-client/react"
import { toastErrorMessage } from "../lib/cn"
import { useFormMutation } from "./use-form-mutation"
import { useResourceForm } from "./use-resource-form"
import { useApplyFormDefaults, type FormDefaultsMap } from "./use-form-defaults"

type ApiInstance = ReturnType<typeof useApi>

/**
 * Declarative, JSX-free description of a resource form: how to validate it,
 * how to seed it from an API entity, and how to map its values to create/update
 * payloads. Lives in the module's `*.config.ts`.
 */
export type ResourceFormConfig<
    TValues extends FieldValues,
    TCreate = unknown,
    TUpdate = unknown,
> = {
    schema: ZodType<TValues>
    defaultValues: DefaultValues<TValues>
    mapToFormValues: (data: unknown) => TValues
    toCreate: (values: TValues) => TCreate
    toUpdate: (values: TValues) => TUpdate
    /** Create-only opt-in: pre-fill these fields from the tenant's defaults. */
    defaults?: FormDefaultsMap<TValues>
}

export type UseResourceFormControllerOptions<
    TClient extends ICrudClient,
    TValues extends FieldValues,
    TCreate = unknown,
    TUpdate = unknown,
> = {
    config: ResourceFormConfig<TValues, TCreate, TUpdate>
    /** Selects the CRUD client off the api instance, e.g. `(api) => api.units`. */
    getClient: (api: ApiInstance) => TClient
    /** Singular entity noun, already translated, used in toast/button text. */
    entityLabel: string
    resourceId?: string | null
    initialData?: unknown
    paramKey?: string
    onSuccess?: () => void
    /** When false, skips closing the URL-backed form dialog on success (use on full-page forms). */
    closeOnSuccess?: boolean
    /** Override the react-query key used to load the edited entity. */
    queryKey?: QueryKey
}

export type ResourceFormController<TValues extends FieldValues> = {
    form: UseFormReturn<TValues>
    isEditing: boolean
    isBusy: boolean
    error: Error | null
    entityLabel: string
    onSubmit: (values: TValues) => void
}

/**
 * Wires a resource form end-to-end: loads the entity for editing, validates,
 * branches create/update, fires the `toast.promise`, and resets/closes on success.
 * Composes the existing `useResourceForm` + `useFormMutation` + `useFormDialog`.
 */
export function useResourceFormController<
    TClient extends ICrudClient,
    TValues extends FieldValues,
    TCreate = unknown,
    TUpdate = unknown,
>({
    config,
    getClient,
    entityLabel,
    resourceId,
    initialData,
    paramKey,
    onSuccess,
    closeOnSuccess = true,
    queryKey,
}: UseResourceFormControllerOptions<TClient, TValues, TCreate, TUpdate>): ResourceFormController<TValues> {
    const api = useApi()
    const client = getClient(api)
    const t = useTranslations("system.resourceForm")
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<TValues, unknown>({
        schema: config.schema,
        defaultValues: config.defaultValues,
        resourceId,
        initialize: (id) => client.show(id),
        initialData,
        queryKey: queryKey ?? [client.key, "show", resourceId],
        mapToFormValues: config.mapToFormValues,
    })

    useApplyFormDefaults({
        form,
        map: config.defaults ?? {},
        enabled: !isEditing,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values: TValues) => {
            const promise = isEditing && resourceId
                ? client.update(resourceId, config.toUpdate(values))
                : client.create(config.toCreate(values))

            toast.promise(promise, {
                loading: isEditing ? t("updating") : t("creating"),
                success: isEditing
                    ? t("updated", { entity: entityLabel })
                    : t("created", { entity: entityLabel }),
                error: (err: unknown) => toastErrorMessage(
                    err,
                    isEditing
                        ? t("updateFailed", { entity: entityLabel })
                        : t("createFailed", { entity: entityLabel }),
                ),
            })

            return promise
        },
        onSuccess: () => {
            form.reset(config.defaultValues)
            if (closeOnSuccess) {
                close()
            }
            onSuccess?.()
        },
    })

    return {
        form,
        isEditing,
        isBusy: isPending || isInitializing,
        error: error ?? null,
        entityLabel,
        onSubmit: (values: TValues) => mutate(values),
    }
}
