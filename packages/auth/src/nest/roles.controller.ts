import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RoleService } from '../session/roles.js';
import { SessionError } from '../session/session.js';
import type { AuthClaims } from '../types.js';
import {
  AssignRoleDto,
  CreateRoleDto,
  RoleAssignmentResponseDto,
  RoleListResponseDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './auth.dto.js';
import { CurrentUser, JwtAuthGuard } from './guards.js';

function success<T>(message: string, data: T) {
  return { status: 'success' as const, message, data };
}

async function run<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof SessionError) throw new HttpException(error.message, error.status);
    throw error;
  }
}

@ApiTags('auth')
@UseGuards(JwtAuthGuard)
@Controller('auth/roles')
export class RolesController {
  constructor(private readonly roles: RoleService) {}

  @Post()
  @ApiCreatedResponse({ type: RoleResponseDto })
  async create(@CurrentUser() claims: AuthClaims | undefined, @Body() body: CreateRoleDto) {
    if (!claims) throw new UnauthorizedException();
    const role = await run(() => this.roles.create(claims.permissions, body));
    return success('Role created', role);
  }

  @Patch(':slug')
  @ApiOkResponse({ type: RoleResponseDto })
  async update(
    @CurrentUser() claims: AuthClaims | undefined,
    @Param('slug') slug: string,
    @Body() body: UpdateRoleDto,
  ) {
    if (!claims) throw new UnauthorizedException();
    const role = await run(() => this.roles.update(claims.permissions, slug, body));
    return success('Role updated', role);
  }

  @Get()
  @ApiOkResponse({ type: RoleListResponseDto })
  async list(@CurrentUser() claims: AuthClaims | undefined) {
    if (!claims) throw new UnauthorizedException();
    const roles = await run(() => this.roles.list(claims.permissions));
    return success('Roles', roles);
  }
}

@ApiTags('auth')
@UseGuards(JwtAuthGuard)
@Controller('auth/users')
export class UserRolesController {
  constructor(private readonly roles: RoleService) {}

  @Post(':userId/roles')
  @ApiCreatedResponse({ type: RoleAssignmentResponseDto })
  async assign(
    @CurrentUser() claims: AuthClaims | undefined,
    @Param('userId') userId: string,
    @Body() body: AssignRoleDto,
  ) {
    if (!claims) throw new UnauthorizedException();
    const assignment = await run(() => this.roles.assign(claims.permissions, userId, body.slug));
    return success('Role assigned', assignment);
  }

  @Delete(':userId/roles/:slug')
  @ApiOkResponse({ type: RoleAssignmentResponseDto })
  async remove(
    @CurrentUser() claims: AuthClaims | undefined,
    @Param('userId') userId: string,
    @Param('slug') slug: string,
  ) {
    if (!claims) throw new UnauthorizedException();
    const assignment = await run(() => this.roles.remove(claims.permissions, userId, slug));
    return success('Role removed', assignment);
  }
}
