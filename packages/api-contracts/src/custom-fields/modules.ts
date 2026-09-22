/**
 * Registry of entities that support custom fields.
 * Projects extend this object with their own module keys.
 */
export const customFieldModules = {} as const;

export type CustomFieldModule = string;
