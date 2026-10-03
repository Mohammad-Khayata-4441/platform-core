import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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

/** Arabic and English label stored on a role. Boot does not look the role up by either value. */
export class RoleLabelDto {
  @ApiProperty({ type: 'string', example: 'كاتب' })
  @IsString()
  @IsNotEmpty()
  ar!: string;

  @ApiProperty({ type: 'string', example: 'Clerk' })
  @IsString()
  @IsNotEmpty()
  en!: string;
}

export class CreateRoleDto {
  @ApiProperty({ type: 'string', example: 'clerk' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ type: () => RoleLabelDto })
  @ValidateNested()
  @Type(() => RoleLabelDto)
  label!: RoleLabelDto;

  @ApiProperty({ type: 'string', isArray: true, example: ['users.read'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

/** New label and grants. The slug in the URL is the identity and is left unchanged. */
export class UpdateRoleDto {
  @ApiProperty({ type: () => RoleLabelDto })
  @ValidateNested()
  @Type(() => RoleLabelDto)
  label!: RoleLabelDto;

  @ApiProperty({ type: 'string', isArray: true, example: ['files.read'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class AssignRoleDto {
  @ApiProperty({ type: 'string', example: 'clerk' })
  @IsString()
  @IsNotEmpty()
  slug!: string;
}

export class RoleAssignmentDto {
  @ApiProperty({ type: 'string' })
  userId!: string;

  @ApiProperty({ type: 'string', example: 'clerk' })
  slug!: string;
}

export class RoleAssignmentResponseDto {
  @ApiProperty({ type: 'string', example: 'success' })
  status!: 'success';

  @ApiProperty({ type: 'string', example: 'Role assigned' })
  message!: string;

  @ApiProperty({ type: () => RoleAssignmentDto })
  data!: RoleAssignmentDto;
}

export class RoleViewDto {
  @ApiProperty({ type: 'string', example: 'clerk' })
  slug!: string;

  /** Translated label. The boot owner row is English only until an owner edits it. */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { ar: 'كاتب', en: 'Clerk' },
  })
  label!: Record<string, string>;

  @ApiProperty({ type: 'string', isArray: true, example: ['users.read'] })
  permissions!: string[];
}

export class RoleResponseDto {
  @ApiProperty({ type: 'string', example: 'success' })
  status!: 'success';

  @ApiProperty({ type: 'string', example: 'Role created' })
  message!: string;

  @ApiProperty({ type: () => RoleViewDto })
  data!: RoleViewDto;
}

export class RoleListResponseDto {
  @ApiProperty({ type: 'string', example: 'success' })
  status!: 'success';

  @ApiProperty({ type: 'string', example: 'Roles' })
  message!: string;

  @ApiProperty({ type: () => RoleViewDto, isArray: true })
  data!: RoleViewDto[];
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
