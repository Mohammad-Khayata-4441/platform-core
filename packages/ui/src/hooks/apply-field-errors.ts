import type { FieldPath, FieldValues } from "react-hook-form"
import type { ValidationErrors } from "@core/api-client"

/** The subset of a react-hook-form instance this helper needs. */
export type FieldErrorForm<TValues extends FieldValues> = {
    setError: (name: FieldPath<TValues>, error: { message: string }) => void
}

/**
 * Applies the server's field-level validation errors to a react-hook-form
 * instance so each failing field shows its message.
 */
export function applyFieldErrors<TValues extends FieldValues>(
    form: FieldErrorForm<TValues>,
    validationErrors: ValidationErrors | undefined,
): void {
    if (!validationErrors) return

    for (const [field, messages] of Object.entries(validationErrors)) {
        const message = messages[0]
        if (!message) continue
        form.setError(field as FieldPath<TValues>, { message })
    }
}
