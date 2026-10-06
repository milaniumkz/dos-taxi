import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { DispatchService } from './dispatch.service';
import { IncomingDispatchOfferDto } from './dto/incoming-dispatch-offer.dto';

@ApiTags('executor-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('executor/orders')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('incoming')
  @ApiOperation({ summary: 'Get incoming order offers for executor' })
  @ApiOkResponse({ type: IncomingDispatchOfferDto, isArray: true })
  getIncomingOffers(
    @CurrentUser() user: JwtPayload,
  ): Promise<IncomingDispatchOfferDto[]> {
    return this.dispatchService.getIncomingOffers(user.sub);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept incoming order offer' })
  @ApiOkResponse({ description: 'Order accepted' })
  acceptOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
  ) {
    return this.dispatchService.acceptOrder(user.sub, orderId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject incoming order offer' })
  @ApiOkResponse({ description: 'Offer rejected' })
  async rejectOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
  ): Promise<{ success: true }> {
    await this.dispatchService.rejectOrder(user.sub, orderId);
    return { success: true };
  }
}
