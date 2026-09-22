import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsString,
    ValidateNested,
} from 'class-validator';

/** Shared Swagger DTO for a bulk operation result. Reused across resources. */
export class BulkErrorDto {
    @ApiProperty({ required: false })
    id?: string;

    @ApiProperty({ example: 'Resource not found' })
    message: string = '';
}

export type BulkError = { id?: string; message: string };

export type BulkResult = {
    total: number;
    succeeded: number;
    failed: number;
    errors: BulkError[];
};

export class BulkResultResponseDto {
    @ApiProperty({ example: 5 })
    total: number = 0;

    @ApiProperty({ example: 4 })
    succeeded: number = 0;

    @ApiProperty({ example: 1 })
    failed: number = 0;

    @ApiProperty({ type: [BulkErrorDto] })
    errors: BulkErrorDto[] = [];
}

/** Runtime class-validator DTO for a bulk-delete body: `{ ids: string[] }`. */
export class BulkDeleteBodyDto {
    @ApiProperty({ type: [String], example: ['018e1234-abcd-7000-a001-000000000001'] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[] = [];
}

export type BulkUpdateItemDto = { id: string } & Record<string, unknown>;

/**
 * Builds a `{ items: BulkUpdateItemDto[] }` body DTO for a resource.
 *
 * The item class extends the resource's `UpdateDto` (whose fields are already
 * optional via `@IsOptional`) and adds a required `id`, so each list element
 * is `{ id: string } & Partial<UpdateDto>` — exactly the bulk-partial-update
 * contract. `@ValidateNested({ each: true })` + `@Type()` drive per-item
 * class-validator validation via {@link ClassDtoBodyPipe}.
 */
export function createBulkUpdateBodyDto(
    UpdateDto: new (...args: unknown[]) => unknown,
): {
    itemDto: new (...args: unknown[]) => unknown;
    arrayDto: new (...args: unknown[]) => unknown;
} {
    class BulkUpdateItem extends (UpdateDto as new (...args: unknown[]) => object) {
        @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
        @IsString()
        @IsNotEmpty()
        id: string = '';
    }

    class BulkUpdateBody {
        @ApiProperty({ type: [BulkUpdateItem], description: 'Items to update. Each item is { id, ...partial update fields }.' })
        @IsArray()
        @ArrayMinSize(1)
        @ValidateNested({ each: true })
        @Type(() => BulkUpdateItem)
        items: BulkUpdateItem[] = [];
    }

    return { itemDto: BulkUpdateItem as unknown as new (...args: unknown[]) => unknown, arrayDto: BulkUpdateBody as unknown as new (...args: unknown[]) => unknown };
}