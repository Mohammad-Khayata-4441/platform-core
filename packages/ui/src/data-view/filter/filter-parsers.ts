import { createParser } from "nuqs"
import type { ParsedFilters } from "@core/api-contracts"

function isParsedFilters(value: unknown): value is ParsedFilters {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const parseAsFilters = createParser<ParsedFilters | null>({
    parse(value) {
        if (!value) return null

        try {
            // JSON.parse's return type is always `any`; `as unknown` is the standard, correct way to
            // force the caller to narrow it (via isParsedFilters below) instead of trusting an unchecked `any`.
            // eslint-disable-next-line no-restricted-syntax -- see comment above: standard JSON.parse narrowing pattern
            const parsed = JSON.parse(value) as unknown
            return isParsedFilters(parsed) ? parsed : null
        } catch {
            return null
        }
    },
    serialize(value) {
        if (!value || Object.keys(value).length === 0) return ""
        return JSON.stringify(value)
    },
    eq(a, b) {
        return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})
    },
})
