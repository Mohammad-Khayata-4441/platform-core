export function parseBooleanCell(value: unknown): boolean | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return undefined;
}

export function parseNumberCell(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseStringCell(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
}

/** Normalizes FK lookup keys (category name, unit name, etc.) for case-insensitive matching. */
export function normalizeLookupKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseListCell(value: unknown, separator = '|'): string[] {
    const text = parseStringCell(value);
    if (!text) return [];
    return text.split(separator).map((part) => part.trim()).filter(Boolean);
}
