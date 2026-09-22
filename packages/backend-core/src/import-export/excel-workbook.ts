import ExcelJS from 'exceljs';
import type { SheetColumn, WorkbookSheet } from './types.js';

const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
};

function applyHeaderStyle(row: ExcelJS.Row): void {
    row.font = { bold: true };
    row.fill = HEADER_FILL;
}

function normalizeCellValue(value: ExcelJS.CellValue): unknown {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && value !== null) {
        if ('richText' in value) {
            const richText = value as ExcelJS.CellRichTextValue;
            return richText.richText.map((part) => part.text).join('');
        }
        if ('text' in value) {
            return (value as ExcelJS.CellHyperlinkValue).text;
        }
        if ('result' in value) {
            return (value as ExcelJS.CellFormulaValue).result ?? undefined;
        }
    }
    if (value instanceof Date) return value.toISOString();
    return value;
}

export async function buildWorkbookBuffer(sheets: WorkbookSheet[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ERP';
    workbook.created = new Date();

    for (const sheetDef of sheets) {
        const sheet = workbook.addWorksheet(sheetDef.name);
        sheet.columns = sheetDef.columns.map((column) => ({
            header: column.header,
            key: column.key,
            width: column.width ?? Math.max(column.header.length + 2, 14),
        }));

        applyHeaderStyle(sheet.getRow(1));

        for (const row of sheetDef.rows) {
            const values: Record<string, unknown> = {};
            for (const column of sheetDef.columns) {
                values[column.key] = row[column.key] ?? '';
            }
            sheet.addRow(values);
        }

        sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}

export async function parseWorksheetRows(
    buffer: Buffer | Uint8Array,
    sheetName?: string,
): Promise<{ columns: SheetColumn[]; rows: Record<string, unknown>[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

    const sheet =
        (sheetName ? workbook.getWorksheet(sheetName) : undefined) ??
        workbook.worksheets.find((ws) => ws.name.toLowerCase() !== 'instructions') ??
        workbook.worksheets[0];

    if (!sheet) {
        return { columns: [], rows: [] };
    }

    const headerRow = sheet.getRow(1);
    const columns: SheetColumn[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = String(normalizeCellValue(cell.value) ?? '').trim();
        if (!header) return;
        columns.push({ key: header, header });
    });

    if (columns.length === 0) {
        return { columns: [], rows: [] };
    }

    const rows: Record<string, unknown>[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const record: Record<string, unknown> = {};
        let hasValue = false;

        columns.forEach((column, index) => {
            const cell = row.getCell(index + 1);
            const value = normalizeCellValue(cell.value);
            if (value !== undefined && value !== '') {
                hasValue = true;
            }
            record[column.key] = value ?? '';
        });

        if (hasValue) {
            rows.push(record);
        }
    });

    return { columns, rows };
}

export function buildInstructionsSheet(rows: Array<{ column: string; description: string }>): WorkbookSheet {
    return {
        name: 'Instructions',
        columns: [
            { key: 'column', header: 'Column', width: 24 },
            { key: 'description', header: 'Description', width: 64 },
        ],
        rows,
    };
}
