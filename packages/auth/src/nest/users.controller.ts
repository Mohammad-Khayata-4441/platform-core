import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionError } from '../session/session.js';
import { UserService } from '../session/users.js';
import type { AuthClaims } from '../types.js';
import { UpdateUserDto, UserListResponseDto, UserResponseDto } from './auth.dto.js';
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
@Controller('auth/users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  @ApiOkResponse({ type: UserListResponseDto })
  async list(@CurrentUser() claims: AuthClaims | undefined) {
    if (!claims) throw new UnauthorizedException();
    const users = await run(() => this.users.list(claims.permissions));
    return success('Users', users);
  }

  @Patch(':userId')
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @CurrentUser() claims: AuthClaims | undefined,
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    if (!claims) throw new UnauthorizedException();
    const user = await run(() => this.users.update(claims.permissions, userId, body));
    return success('User updated', user);
  }

  @Post(':userId/deactivate')
  @HttpCode(200)
  @ApiOkResponse({ type: UserResponseDto })
  async deactivate(@CurrentUser() claims: AuthClaims | undefined, @Param('userId') userId: string) {
    if (!claims) throw new UnauthorizedException();
    const user = await run(() => this.users.deactivate(claims.permissions, userId));
    return success('User deactivated', user);
  }

  @Post(':userId/restore')
  @HttpCode(200)
  @ApiOkResponse({ type: UserResponseDto })
  async restore(@CurrentUser() claims: AuthClaims | undefined, @Param('userId') userId: string) {
    if (!claims) throw new UnauthorizedException();
    const user = await run(() => this.users.restore(claims.permissions, userId));
    return success('User restored', user);
  }
}
