export const fieldTypes = {
    TEXT: 'TEXT',
    DATE: 'DATE',
    NUMBER: 'NUMBER',
    SELECT: 'SELECT',
    BOOLEAN: 'BOOLEAN',
    MULTI_SELECT: 'MULTI_SELECT',
    FILE: 'FILE',
} as const

export type FieldType = (typeof fieldTypes)[keyof typeof fieldTypes]
