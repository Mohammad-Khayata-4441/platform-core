import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthClaims } from '@core/auth';
import { CurrentUser, JwtAuthGuard } from '@core/auth/nest';
import { FileError, FileService } from '../files.js';
import { FileResponseDto } from './files.dto.js';
import { FileUploadInterceptor } from './upload.js';

interface UploadedPart {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

function success<T>(message: string, data: T) {
  return { status: 'success' as const, message, data };
}

async function run<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof FileError) throw new HttpException(error.message, error.status);
    throw error;
  }
}

@ApiTags('files')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FileService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: FileResponseDto })
  async upload(
    @CurrentUser() claims: AuthClaims | undefined,
    @UploadedFile() file: UploadedPart | undefined,
  ) {
    if (!claims) throw new UnauthorizedException();
    if (!file?.buffer) throw new HttpException('A file is required', 400);
    const saved = await run(() =>
      this.files.upload(claims.permissions, claims.sub, {
        name: file.originalname || 'file',
        mediaType: file.mimetype,
        bytes: file.buffer,
      }),
    );
    return success('File uploaded', saved);
  }

  @Get(':id')
  @ApiOkResponse({ type: FileResponseDto })
  async read(@CurrentUser() claims: AuthClaims | undefined, @Param('id') id: string) {
    if (!claims) throw new UnauthorizedException();
    const file = await run(() => this.files.read(claims.permissions, id));
    return success('File', file);
  }

  @Delete(':id')
  @ApiOkResponse({ type: FileResponseDto })
  async remove(@CurrentUser() claims: AuthClaims | undefined, @Param('id') id: string) {
    if (!claims) throw new UnauthorizedException();
    const file = await run(() => this.files.delete(claims.permissions, id));
    return success('File deleted', file);
  }
}
