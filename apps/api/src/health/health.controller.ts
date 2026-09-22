import { Controller, Get } from '@nestjs/common';
import { ApiResponseBuilder } from '@core/backend-core';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return ApiResponseBuilder.success({ status: 'ok' }, 'Healthy');
  }
}
