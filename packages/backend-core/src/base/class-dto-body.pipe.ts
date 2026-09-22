import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Validates and transforms the request body using runtime DTO classes (class-validator),
 * for factory-generated controllers where generic `@Body()` types do not carry metadata.
 */
@Injectable()
export class ClassDtoBodyPipe implements PipeTransform<unknown, unknown> {
  constructor(private readonly dtoClass: new (...args: unknown[]) => unknown) {}

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (metadata.type !== 'body') {
      return value;
    }
    const ctor = this.dtoClass as new (...args: unknown[]) => object;
    const instance = plainToInstance(ctor, value ?? {});
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      throw new UnprocessableEntityException(errors);
    }
    return instance;
  }
}

export function createClassDtoBodyPipe(
  dtoClass: new (...args: unknown[]) => unknown,
): ClassDtoBodyPipe {
  return new ClassDtoBodyPipe(dtoClass);
}
