import { ApiProperty } from '@nestjs/swagger';

/** Shared Swagger DTO for an import operation result. Reused across resources. */
export class ImportRowErrorDto {
    @ApiProperty({ example: 5 })
    row: number = 0;

    @ApiProperty({ example: 'category_name', required: false })
    field?: string;

    @ApiProperty({ example: 'Category "Phones" not found' })
    message: string = '';
}

export class ImportResultResponseDto {
    @ApiProperty({ example: 100 })
    totalRows: number = 0;

    @ApiProperty({ example: 80 })
    created: number = 0;

    @ApiProperty({ example: 15 })
    updated: number = 0;

    @ApiProperty({ example: 5 })
    skipped: number = 0;

    @ApiProperty({ type: [ImportRowErrorDto] })
    errors: ImportRowErrorDto[] = [];

    @ApiProperty({ example: true })
    dryRun: boolean = false;
}