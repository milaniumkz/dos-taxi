import { RideMarketplaceGuard } from "./ride-marketplace.guard";
import { UserRole } from "@dos/shared-types";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiHeader,
} from "@nestjs/swagger";
import { Roles } from "../../shared/decorators/roles.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { OrderResponseDto } from "../orders/dto/order-response.dto";
import {
  AcceptRideOfferDto,
  CreateRideRequestDto,
  RideFeedQueryDto,
  RideQuoteDto,
  SubmitRideOfferDto,
} from "./dto/ride-request.dto";
import { RideMarketplaceService } from "./ride-marketplace.service";
import {
  RideCityResponseDto,
  RideQuoteResponseDto,
  RideFeedResponseDto,
  RideOfferResponseDto,
  RideOffersResponseDto,
} from "./dto/ride-response.dto";
@ApiTags("ride-marketplace")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RideMarketplaceGuard)
@Controller("ride-requests")
export class RideMarketplaceController {
  constructor(private readonly marketplace: RideMarketplaceService) {}
  @Get("cities")
  @Roles(UserRole.CLIENT, UserRole.EXECUTOR)
  @ApiOperation({
    summary: "List active cities for selecting a driver service city",
  })
  @ApiOkResponse({
    type: [RideCityResponseDto],
  })
  cities() {
    return this.marketplace.cities();
  }
  @Post("quote")
  @HttpCode(200)
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: "Get city pricing basis, minimum price and price-button step",
  })
  @ApiOkResponse({
    type: RideQuoteResponseDto,
  })
  quote(@Body() dto: RideQuoteDto) {
    return this.marketplace.quote(dto);
  }
  @Get("feed")
  @Roles(UserRole.EXECUTOR)
  @ApiOperation({
    summary: "List eligible passenger requests by nearest pickup first",
  })
  @ApiOkResponse({
    type: RideFeedResponseDto,
  })
  feed(@CurrentUser() user: JwtPayload, @Query() query: RideFeedQueryDto) {
    return this.marketplace.feed(user.sub, query);
  }
  @Post()
  @Roles(UserRole.CLIENT)
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: true,
    description: "UUID generated once for a request submission",
  })
  @ApiOperation({
    summary: "Submit an unassigned passenger request with a proposed price",
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRideRequestDto,
    @Headers("x-idempotency-key") key: string,
  ) {
    return this.marketplace.create(user.sub, dto, key);
  }
  @Get(":id/offers")
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: "Get driver price proposals and vehicle details for own request",
  })
  @ApiOkResponse({
    type: RideOffersResponseDto,
  })
  offers(
    @CurrentUser() user: JwtPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.marketplace.listOffers(user.sub, id);
  }
  @Post(":id/offers")
  @Roles(UserRole.EXECUTOR)
  @ApiOperation({
    summary:
      "Propose or revise a price using button-step increments; identical retries do not duplicate an offer",
  })
  @ApiCreatedResponse({ type: RideOfferResponseDto })
  submit(
    @CurrentUser() user: JwtPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitRideOfferDto,
  ) {
    return this.marketplace.submit(user.sub, id, dto);
  }
  @Post(":id/offers/withdraw")
  @HttpCode(200)
  @Roles(UserRole.EXECUTOR)
  @ApiOperation({
    summary: "Withdraw own pending driver proposal idempotently",
  })
  @ApiOkResponse({ description: "Proposal withdrawn" })
  withdraw(
    @CurrentUser() user: JwtPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.marketplace.withdraw(user.sub, id);
  }
  @Post(":id/offers/:offerId/accept")
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      "Passenger selects an unchanged proposal; locks prevent multiple assigned drivers",
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  accept(
    @CurrentUser() user: JwtPayload,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("offerId", new ParseUUIDPipe()) offerId: string,
    @Body() dto: AcceptRideOfferDto,
  ) {
    return this.marketplace.accept(user.sub, id, offerId, dto);
  }
}
