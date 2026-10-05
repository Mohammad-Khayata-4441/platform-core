import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { FileService, type FileServiceOptions } from '../files.js';
import { FilesController } from './files.controller.js';
import { FILES_OPTIONS } from './tokens.js';
import { FileUploadInterceptor } from './upload.js';

export interface FilesModuleAsyncOptions<T extends unknown[] = unknown[]> {
  imports?: ModuleMetadata['imports'];
  inject?: InjectionToken[];
  useFactory: (...args: T) => FileServiceOptions | Promise<FileServiceOptions>;
}

@Module({})
export class FilesModule {
  /** The app passes the Prisma accessor and the driver selected by the environment. */
  static forRoot(options: FileServiceOptions): DynamicModule {
    return this.build([{ provide: FILES_OPTIONS, useValue: options }]);
  }

  static forRootAsync<T extends unknown[]>(options: FilesModuleAsyncOptions<T>): DynamicModule {
    return this.build(
      [
        {
          provide: FILES_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ],
      options.imports,
    );
  }

  private static build(
    optionProviders: DynamicModule['providers'],
    imports?: ModuleMetadata['imports'],
  ): DynamicModule {
    return {
      module: FilesModule,
      imports: imports ?? [],
      controllers: [FilesController],
      providers: [
        ...(optionProviders ?? []),
        FileUploadInterceptor,
        {
          provide: FileService,
          useFactory: (options: FileServiceOptions) => new FileService(options),
          inject: [FILES_OPTIONS],
        },
      ],
    };
  }
}
