import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'api',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  health() {
    return this.healthService.getBasicHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Dependency readiness endpoint' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'api',
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: {
          database: { status: 'up' },
          redis: { status: 'up' },
          storage: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    schema: {
      example: {
        status: 'error',
        service: 'api',
        timestamp: '2025-01-01T00:00:00.000Z',
        checks: {
          database: {
            status: 'down',
            details: {
              name: 'Error',
              message: 'connect ECONNREFUSED 127.0.0.1:5432',
            },
          },
          redis: { status: 'up' },
          storage: { status: 'up' },
        },
      },
    },
  })
  async ready() {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'ok') {
      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }
}
