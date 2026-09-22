import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { toErrorResponse } from './api-error-response.js';

type HttpResponseLike = {
  status(code: number): { json(body: unknown): unknown };
};

/**
 * The single global exception filter: converts every thrown value into the
 * shared error envelope so the wire shape matches the documented schema.
 * Unexpected (non-HttpException) failures are logged, never leaked.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponseLike>();
    const { status, body } = toErrorResponse(exception);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }
}
