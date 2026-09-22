import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocalizedStringDto {
    @ApiProperty({ example: 'الليرة السورية' })
    @IsString()
    @IsNotEmpty()
    ar: string = '';

    @ApiPropertyOptional({ example: 'Syrian Pound' })
    @IsOptional()
    @IsString()
    en?: string;
}
