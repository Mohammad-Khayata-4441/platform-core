import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class ItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: { ar: 'منتج', en: 'Item' } }) name!: Record<string, string>;
  @ApiProperty({ example: 'SKU-1' }) sku!: string;
  @ApiProperty({ example: 10 }) price!: number;
  @ApiProperty({ example: 'DRAFT', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] }) status!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CreateItemDto {
  @ApiProperty({ example: { ar: 'منتج', en: 'Item' } })
  @IsObject()
  name!: Record<string, string>;

  @ApiProperty({ example: 'SKU-1' })
  @IsString()
  sku!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  price!: number;

  @ApiPropertyOptional({ example: 'DRAFT', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;
}

export class UpdateItemDto {
  @ApiPropertyOptional({ example: { ar: 'منتج', en: 'Item' } })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @ApiPropertyOptional({ example: 'SKU-1' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;
}
