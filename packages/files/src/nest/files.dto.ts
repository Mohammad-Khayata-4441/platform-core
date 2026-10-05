import { ApiProperty } from '@nestjs/swagger';

/** A file as the HTTP API returns it. `type` is the media type stored at upload. */
export class FileViewDto {
  @ApiProperty({ type: 'string' })
  id!: string;

  @ApiProperty({ type: 'string', example: 'notes.txt' })
  name!: string;

  @ApiProperty({ type: 'string', example: 'text/plain' })
  type!: string;

  @ApiProperty({ type: 'number', example: 10 })
  size!: number;

  @ApiProperty({ type: 'string', example: 'memory/notes.txt' })
  path!: string;

  @ApiProperty({ type: 'string', example: 'https://files.test/notes.txt' })
  url!: string;

  @ApiProperty({ type: 'string' })
  uploadedById!: string;
}

export class FileResponseDto {
  @ApiProperty({ type: 'string', example: 'success' })
  status!: 'success';

  @ApiProperty({ type: 'string', example: 'File uploaded' })
  message!: string;

  @ApiProperty({ type: () => FileViewDto })
  data!: FileViewDto;
}
