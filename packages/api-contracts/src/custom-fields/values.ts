import type { FieldType } from './field-type'

/** Runtime value stored per custom field on an entity. */
export type CustomFieldRuntimeValue = string | number | boolean | string[] | null

/** Map of fieldId → parsed value on entity responses. */
export type CustomFieldValuesMap = Record<string, CustomFieldRuntimeValue>

export function serializeCustomFieldValue(type: FieldType, value: CustomFieldRuntimeValue): string {
    if (value === null || value === undefined) return ''

    switch (type) {
        case 'BOOLEAN':
            return value === true || value === 'true' ? 'true' : 'false'
        case 'MULTI_SELECT':
            return Array.isArray(value) ? JSON.stringify(value) : JSON.stringify([String(value)])
        case 'NUMBER':
            return String(value)
        default:
            return String(value)
    }
}

export function deserializeCustomFieldValue(type: FieldType, raw: string): CustomFieldRuntimeValue {
    if (!raw) return null

    switch (type) {
        case 'BOOLEAN':
            return raw === 'true'
        case 'NUMBER': {
            const num = Number(raw)
            return Number.isNaN(num) ? null : num
        }
        case 'MULTI_SELECT':
            try {
                const parsed = JSON.parse(raw)
                return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
            } catch {
                return raw.split(',').map((s) => s.trim()).filter(Boolean)
            }
        default:
            return raw
    }
}
