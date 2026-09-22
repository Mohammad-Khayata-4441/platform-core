"use client"

import { useEffect } from "react"
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, type QueryKey } from "@tanstack/react-query"
import type { ZodType } from "zod"

type UseResourceFormOptions<TFormValues extends FieldValues, TApiData = unknown> = {
    schema: ZodType<TFormValues, any, any>
    defaultValues: DefaultValues<TFormValues>
    resourceId?: string | null
    initialize?: (id: string) => Promise<TApiData>
    mapToFormValues: (data: TApiData) => TFormValues
    initialData?: TApiData | null
    queryKey?: QueryKey
}

type UseResourceFormReturn<TFormValues extends FieldValues> = {
    form: UseFormReturn<TFormValues>
    isEditing: boolean
    isInitializing: boolean
}

export function useResourceForm<TFormValues extends FieldValues, TApiData = unknown>({
    schema,
    defaultValues,
    resourceId,
    initialize,
    mapToFormValues,
    initialData,
    queryKey,
}: UseResourceFormOptions<TFormValues, TApiData>): UseResourceFormReturn<TFormValues> {
    const isEditing = !!resourceId

    const { data: queriedData, isLoading: isQueryLoading } = useQuery<TApiData>({
        queryKey: queryKey ?? ["resource", resourceId],
        queryFn: () => initialize!(resourceId!),
        enabled: isEditing && !!initialize,
    
    })

    const resolvedData = queriedData ?? (isEditing ? initialData : undefined)

    const form = useForm<TFormValues>({
        resolver: zodResolver(schema)  ,
        defaultValues,
    })

    useEffect(() => {
        if (!isEditing) {
            if (initialData) {
                form.reset({ ...defaultValues, ...initialData }  )
            } else {
                form.reset(defaultValues)
            }
            return
        }

        if (resolvedData) {
            form.reset(mapToFormValues(resolvedData)  )
        }
    }, [isEditing, resolvedData, initialData]) // eslint-disable-line react-hooks/exhaustive-deps

    return { form, isEditing, isInitializing: isEditing && !!initialize && isQueryLoading }
}
