/**
 * Standardized API response DTO shapes for Swagger documentation.
 *
 * NOTE: These are reference types only — used for documentation purposes.
 * The actual runtime responses are built by ApiResponseBuilder.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 50 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 0;

  @ApiProperty({ example: 10 })
  limit: number = 0;

  @ApiPropertyOptional({ example: 5 })
  totalPages?: number;
}

export class ListFilterFieldDto {
  @ApiProperty({ example: 'name' })
  field: string = '';

  @ApiProperty({ example: 'string', enum: ['string', 'number', 'boolean', 'date', 'enum', 'id'] })
  type: string = 'string';

  @ApiProperty({
    example: ['$eq', '$like', '$in', '$isNull'],
    enum: ['$eq', '$like', '$gte', '$lte', '$in', '$isNull'],
    isArray: true,
  })
  operators: string[] = [];

  @ApiPropertyOptional({ example: ['active', 'draft'], type: [String] })
  enumValues?: string[];

  @ApiPropertyOptional({ example: 'categories' })
  foreignResourceKey?: string;
}

export class ApiMetaDto {
  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  pagination?: PaginationMetaDto;

  @ApiPropertyOptional({
    type: () => ListFilterFieldDto,
    isArray: true,
    description: 'Filterable fields and allowed operators for this list resource',
  })
  filterOptions?: ListFilterFieldDto[];
}

export class ApiSuccessResponseDto {
  @ApiProperty({ example: 'success' })
  status: 'success' = 'success';

  @ApiProperty({ example: 'Operation successful' })
  message: string = '';

  @ApiPropertyOptional({ type: () => ApiMetaDto })
  meta?: ApiMetaDto;
}

/** A single field-level validation failure inside {@link ApiErrorDto}. */
export class ApiFieldErrorDto {
  @ApiProperty({ example: 'email' })
  field: string = '';

  @ApiProperty({ example: 'email must be a valid email address' })
  message: string = '';

  @ApiPropertyOptional({ example: 'isEmail' })
  code?: string;
}

export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string = '';

  @ApiProperty({ example: 'Validation failed' })
  message: string = '';

  @ApiPropertyOptional({ type: () => ApiFieldErrorDto, isArray: true })
  details?: ApiFieldErrorDto[];
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status: 'error' = 'error';

  @ApiProperty({ example: 'Validation failed' })
  message: string = '';

  @ApiProperty({
    type: () => Object,
    nullable: true,
    default: null,
    example: null,
    description: 'Always null on error responses',
  })
  data: null = null;

  @ApiProperty({ type: () => ApiErrorDto })
  error: ApiErrorDto = new ApiErrorDto();
}
