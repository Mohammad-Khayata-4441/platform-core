"use client"

import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { ApiError } from "@core/api-client"
import { applyFieldErrors } from "./apply-field-errors"

export function useFormMutation<TValues extends FieldValues, TResponse = unknown>(
    form: UseFormReturn<TValues>,
    options: UseMutationOptions<TResponse, Error, TValues>,
) {
    return useMutation<TResponse, Error, TValues>({
        ...options,
        onError: (err, vars, values, ctx) => {
            if (err instanceof ApiError) {
                applyFieldErrors(form, err.validationErrors)
            }
            options.onError?.(err, vars, values, ctx,)
        },
    })
}
