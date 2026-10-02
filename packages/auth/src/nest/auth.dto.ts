import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Email or phone, plus a password. Either identifier may be omitted; both may be sent. */
export class PasswordCredentialsDto {
  @ApiPropertyOptional({ type: 'string', example: 'ada@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: 'string', example: '+15551212000' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ type: 'string', example: 'correct horse' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class SessionRoleDto {
  @ApiProperty({ type: 'string', example: 'owner' })
  slug!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { en: 'Owner' },
  })
  label!: Record<string, string>;
}

export class SessionUserDto {
  @ApiProperty({ type: 'string' })
  id!: string;

  @ApiProperty({ type: 'string', nullable: true, example: 'ada@example.com' })
  email!: string | null;

  @ApiProperty({ type: 'string', nullable: true, example: '+15551212000' })
  phone!: string | null;

  @ApiProperty({ type: () => SessionRoleDto, isArray: true })
  roles!: SessionRoleDto[];
}

/** Success envelope for auth routes. `data` is null after logout. */
export class SessionResponseDto {
  @ApiProperty({ type: 'string', example: 'success' })
  status!: 'success';

  @ApiProperty({ type: 'string', example: 'Registered' })
  message!: string;

  @ApiProperty({ type: () => SessionUserDto, nullable: true })
  data!: SessionUserDto | null;
}
