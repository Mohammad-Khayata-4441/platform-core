import 'reflect-metadata';
import { IsArray, IsNotEmpty, IsString, validateSync, type ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApiErrorCode } from '@core/api-contracts';
import { flattenValidationErrors, validationExceptionFactory } from './validation-exception.factory';

class SampleDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() code!: string;
}

class OuterDto {
  @IsArray() lines!: unknown[];
}

function errorsFor(target: unknown, source: object): ValidationError[] {
  return validateSync(plainToInstance(target as new () => object, source));
}

describe('validationExceptionFactory', () => {
  it('names each failing field in the shared error shape', () => {
    const exception = validationExceptionFactory(errorsFor(SampleDto, {}));
    const response = exception.getResponse() as {
      code: string;
      message: string;
      details: { field: string; message: string }[];
    };

    expect(exception.getStatus()).toBe(422);
    expect(response.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(response.message).toBe('Validation failed');
    expect(new Set(response.details.map((detail) => detail.field))).toEqual(new Set(['code', 'name']));
    for (const detail of response.details) {
      expect(typeof detail.message).toBe('string');
      expect(detail.message.length).toBeGreaterThan(0);
    }
  });
});

describe('flattenValidationErrors', () => {
  it('addresses nested fields with dotted paths', () => {
    const nested: ValidationError[] = [
      {
        target: {},
        value: undefined,
        property: 'lines',
        children: [
          {
            target: {},
            value: undefined,
            property: '0',
            children: [
              {
                target: {},
                value: undefined,
                property: 'quantity',
                children: [],
                constraints: { isNumber: 'quantity must be a number' },
              },
            ],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(nested)).toEqual([
      { field: 'lines.0.quantity', message: 'quantity must be a number', code: 'isNumber' },
    ]);
  });
});
