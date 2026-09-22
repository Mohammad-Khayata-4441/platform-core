import 'reflect-metadata';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IsEmail, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { ApiErrorResponse } from '@core/api-contracts';
import { toErrorResponse } from './api-error-response';
import { validationExceptionFactory } from './validation-exception.factory';

class EmailDto {
  @IsEmail() email!: string;
}

describe('toErrorResponse', () => {
  it('passes a structured validation payload through with its field details', () => {
    const exception = new UnprocessableEntityException({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [{ field: 'name', message: 'name must be a string', code: 'isString' }],
    });

    const { status, body } = toErrorResponse(exception);

    expect(status).toBe(422);
    expect(body).toEqual({
      status: 'error',
      message: 'Validation failed',
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'name', message: 'name must be a string', code: 'isString' }],
      },
    } satisfies ApiErrorResponse);
  });

  it('wraps a plain HttpException message in the shared envelope', () => {
    const { status, body } = toErrorResponse(new NotFoundException('Unit not found'));

    expect(status).toBe(404);
    expect(body).toEqual({
      status: 'error',
      message: 'Unit not found',
      data: null,
      error: { code: 'NOT_FOUND', message: 'Unit not found' },
    } satisfies ApiErrorResponse);
  });

  it('never leaks an unexpected error and reports INTERNAL_ERROR', () => {
    const { status, body } = toErrorResponse(new Error('database exploded'));

    expect(status).toBe(500);
    expect(body).toEqual({
      status: 'error',
      message: 'Internal server error',
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    } satisfies ApiErrorResponse);
    expect(JSON.stringify(body)).not.toContain('database exploded');
  });

  it('produces the same body the validation factory throws, end to end', () => {
    const errors = validateSync(plainToInstance(EmailDto, { email: 'not-an-email' }));
    const exception = validationExceptionFactory(errors);

    const { status, body } = toErrorResponse(exception);

    expect(status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.[0]).toMatchObject({ field: 'email', code: 'isEmail' });
    expect(body.error.details?.[0].message).toContain('email');
  });
});
