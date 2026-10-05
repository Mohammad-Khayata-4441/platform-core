import {
  HttpException,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import multer from 'multer';
import type { Observable } from 'rxjs';
import { FILES_OPTIONS, type FileServiceOptions } from './tokens.js';

type UploadParser = (req: Request, res: Response, callback: (error?: unknown) => void) => void;

/**
 * Reads one multipart field named `file` into memory. An upload over the deployment
 * limit is refused here, before the service asks the driver to store anything.
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly parser: UploadParser;

  constructor(@Inject(FILES_OPTIONS) options: FileServiceOptions) {
    this.parser = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: options.maxBytes },
    }).single('file') as UploadParser;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    await readMultipart(this.parser, http.getRequest<Request>(), http.getResponse<Response>());
    return next.handle();
  }
}

function readMultipart(parser: UploadParser, request: Request, response: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    parser(request, response, (error) => {
      if (!error) {
        resolve();
        return;
      }
      const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
      const message = code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload could not be read';
      reject(new HttpException(message, 400));
    });
  });
}
