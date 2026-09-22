import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ParsedFilters } from './filter-schema.js';

export type SortOrder = 'asc' | 'desc';

/**
 * Standard flat query parameters for list endpoints.
 *
 * Usage: GET /units?page=1&limit=10&sortField=name&sortOrder=asc&search=kg&searchIn=name,symbol
 * Filters: filters[name][$like]=kg&filters[isActive][$eq]=true
 */
export interface ApiQueryOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: SortOrder;
  search?: string;
  searchIn?: string;
  filters?: ParsedFilters;
}

export class ApiQueryOptionsDto implements ApiQueryOptions {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field name to sort by' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ example: '', description: 'Full-text search keyword' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Comma-separated field names to search within (e.g. name,symbol)',
  })
  @IsOptional()
  @IsString()
  searchIn?: string;

  /** Documented per-resource via {@link ApiFilterQuery} when a filter schema is configured. */
  @ApiHideProperty()
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => value ?? {})
  filters?: ParsedFilters;
}
