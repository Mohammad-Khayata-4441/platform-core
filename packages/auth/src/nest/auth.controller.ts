import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { REFRESH_TOKEN_COOKIE } from '../constants.js';
import { applySessionCookies, clearSessionCookies, type SessionCookieResponse } from '../session/cookies.js';
import type { OtpSignIn } from '../session/otp.js';
import { normalizeEmail, normalizePhone, SessionError, SessionService } from '../session/session.js';
import type { AuthClaims } from '../types.js';
import { OtpRequestDto, OtpVerifyDto, PasswordCredentialsDto, SessionResponseDto } from './auth.dto.js';
import type { AuthModuleOptions } from './auth.module.js';
import { AUTH_OPTIONS } from './auth.tokens.js';
import { CurrentUser, JwtAuthGuard } from './guards.js';

interface CookieRequest {
  cookies?: Record<string, string | undefined>;
}

function success<T>(message: string, data: T) {
  return { status: 'success' as const, message, data };
}

/** The code and the session use the same normalized address. Exactly one of the two. */
function otpAddress(body: { email?: string; phone?: string }): { email?: string; phone?: string } {
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  if (email && phone) throw new SessionError('Send an email or a phone, not both', 400);
  const address: { email?: string; phone?: string } = {};
  if (email) address.email = email;
  if (phone) address.phone = phone;
  return address;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  @Post('register')
  @ApiBody({ type: PasswordCredentialsDto })
  @ApiCreatedResponse({ type: SessionResponseDto })
  async register(
    @Body() body: PasswordCredentialsDto,
    @Res({ passthrough: true }) res: SessionCookieResponse,
  ) {
    const session = await this.run(() => this.sessions.register(body));
    applySessionCookies(res, session, this.secure);
    return success('Registered', session.user);
  }

  @Post('login')
  @HttpCode(200)
  @ApiBody({ type: PasswordCredentialsDto })
  @ApiOkResponse({ type: SessionResponseDto })
  async login(
    @Body() body: PasswordCredentialsDto,
    @Res({ passthrough: true }) res: SessionCookieResponse,
  ) {
    const session = await this.run(() => this.sessions.login(body));
    applySessionCookies(res, session, this.secure);
    return success('Signed in', session.user);
  }

  @Post('otp/request')
  @HttpCode(200)
  @ApiBody({ type: OtpRequestDto })
  @ApiOkResponse({ type: SessionResponseDto })
  async requestOtp(@Body() body: OtpRequestDto) {
    await this.run(() => this.requireOtp().request(otpAddress(body)));
    return success('Code sent', null);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiBody({ type: OtpVerifyDto })
  @ApiOkResponse({ type: SessionResponseDto })
  async verifyOtp(
    @Body() body: OtpVerifyDto,
    @Res({ passthrough: true }) res: SessionCookieResponse,
  ) {
    const session = await this.run(async () => {
      const address = otpAddress(body);
      await this.requireOtp().verify({ ...address, code: body.code });
      return this.sessions.signInWithVerifiedAddress(address);
    });
    applySessionCookies(res, session, this.secure);
    return success('Signed in', session.user);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionResponseDto })
  async refresh(
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: SessionCookieResponse,
  ) {
    const session = await this.run(() => this.sessions.refresh(req.cookies?.[REFRESH_TOKEN_COOKIE]));
    applySessionCookies(res, session, this.secure);
    return success('Session refreshed', session.user);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionResponseDto })
  async logout(@Req() req: CookieRequest, @Res({ passthrough: true }) res: SessionCookieResponse) {
    await this.run(() => this.sessions.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]));
    clearSessionCookies(res);
    return success('Signed out', null);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: SessionResponseDto })
  async me(@CurrentUser() claims: AuthClaims | undefined) {
    if (!claims) throw new UnauthorizedException();
    const user = await this.run(() => this.sessions.profile(claims.sub));
    return success('Profile', user);
  }

  private get secure(): boolean {
    return this.options.cookieSecure ?? process.env.NODE_ENV === 'production';
  }

  private requireOtp(): OtpSignIn {
    if (!this.options.otp) throw new SessionError('OTP is not configured', 400);
    return this.options.otp;
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof SessionError) throw new HttpException(error.message, error.status);
      throw error;
    }
  }
}
