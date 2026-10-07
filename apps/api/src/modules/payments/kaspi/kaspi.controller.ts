import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { KaspiAccessGuard } from './kaspi-access.guard';
import { KaspiQueryDto, KaspiResponseDto } from './kaspi-query.dto';
import { KaspiService } from './kaspi.service';

@ApiTags('kaspi')
@UseGuards(KaspiAccessGuard)
@Controller('payments/kaspi')
export class KaspiController {
  constructor(private readonly service: KaspiService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Kaspi online protocol: check executor account / credit KZT balance',
  })
  @ApiOkResponse({ type: KaspiResponseDto })
  @ApiForbiddenResponse({
    description: 'Disabled integration or source IP not allowlisted',
  })
  async handle(@Query() query: KaspiQueryDto): Promise<KaspiResponseDto> {
    try {
      return await this.service.handle(query);
    } catch {
      return {
        txn_id: query.txn_id,
        result: 5,
        comment: 'Temporary provider error; retry with the same txn_id',
      };
    }
  }
}
