import { UserRole } from "@dos/shared-types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import {
  DispatchSettingsDto,
  UpdateDispatchSettingsDto,
} from "../dispatch/dto/dispatch-settings.dto";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { PaymentResponseDto } from "../payments/dto/payment-response.dto";
import { PromoCodeEntity } from "../promo-codes/entities/promo-code.entity";
import { UserEntity } from "../users/entities/user.entity";

import { AdminService } from "./admin.service";
import { AdminActivityDto } from "./dto/admin-activity.dto";
import {
  AdminNoteDto,
  CreateAdminNoteDto,
  UpdateAdminNoteDto,
} from "./dto/admin-note.dto";
import { AdminOrderDetailDto } from "./dto/admin-order-detail.dto";
import { AdminOrderSummaryDto } from "./dto/admin-order-summary.dto";
import { AdminOrdersQueryDto } from "./dto/admin-orders-query.dto";
import { AdminOrdersResponseDto } from "./dto/admin-orders-response.dto";
import { AssignOrderDto } from "./dto/assign-order.dto";
import { BlockEntityDto } from "./dto/block-entity.dto";
import { CancelPaymentDto } from "./dto/cancel-payment.dto";
import { CreateCityDto } from "./dto/create-city.dto";
import { CreatePromoCodeDto } from "./dto/create-promo-code.dto";
import { FinancialReportDto } from "./dto/financial-report.dto";
import { ListAdminActivityQueryDto } from "./dto/list-admin-activity-query.dto";
import { ListAdminNotesQueryDto } from "./dto/list-admin-notes-query.dto";
import { ListExecutorsQueryDto } from "./dto/list-executors-query.dto";
import { ListTariffsQueryDto } from "./dto/list-tariffs-query.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { OperationsReportDto } from "./dto/operations-report.dto";
import { PromoCodeAnalyticsQueryDto } from "./dto/promo-code-analytics-query.dto";
import { PromoCodeAnalyticsDto } from "./dto/promo-code-analytics.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { ReportQueryDto } from "./dto/report-query.dto";
import { UpdateAdminExecutorDto } from "./dto/update-admin-executor.dto";
import { UpdateAdminOrderStatusDto } from "./dto/update-admin-order-status.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";
import { UpdateBalanceTopUpDto } from "./dto/update-balance-top-up.dto";
import {
  CreateExecutorPayoutDto,
  UpdateExecutorPayoutDto,
} from "./dto/executor-payout.dto";
import {
  DriverBonusSettingsDto,
  UpdateDriverBonusSettingsDto,
} from "./dto/driver-bonus-settings.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { UpdatePromoCodeDto } from "./dto/update-promo-code.dto";
import { UpdateTariffDto } from "./dto/update-tariff.dto";
import { VerifyExecutorDto } from "./dto/verify-executor.dto";
import { ExecutorBalanceTopUpEntity } from "../executors/entities/executor-balance-top-up.entity";
import { ExecutorPayoutEntity } from "../executors/entities/executor-payout.entity";
import { CityEntity } from "./entities/city.entity";
import { TariffEntity } from "./entities/tariff.entity";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("settings/dispatch")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get dispatch radius and ranking settings" })
  @ApiOkResponse({ type: DispatchSettingsDto })
  getDispatchSettings(): Promise<DispatchSettingsDto> {
    return this.adminService.getDispatchSettings();
  }

  @Patch("settings/dispatch")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update dispatch radius and ranking settings" })
  @ApiOkResponse({ type: DispatchSettingsDto })
  updateDispatchSettings(
    @Body() dto: UpdateDispatchSettingsDto,
  ): Promise<DispatchSettingsDto> {
    return this.adminService.updateDispatchSettings(dto);
  }

  @Get("settings/driver-bonus")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get driver completion bonus settings" })
  @ApiOkResponse({ type: DriverBonusSettingsDto })
  getDriverBonusSettings(): Promise<DriverBonusSettingsDto> {
    return this.adminService.getDriverBonusSettings();
  }

  @Patch("settings/driver-bonus")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update driver completion bonus settings" })
  @ApiOkResponse({ type: DriverBonusSettingsDto })
  updateDriverBonusSettings(
    @Body() dto: UpdateDriverBonusSettingsDto,
  ): Promise<DriverBonusSettingsDto> {
    return this.adminService.updateDriverBonusSettings(dto);
  }

  @Get("cities")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List cities for admin backoffice" })
  @ApiOkResponse({ type: CityEntity, isArray: true })
  listCities(): Promise<CityEntity[]> {
    return this.adminService.listCities();
  }

  @Get("cities/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get city details for admin backoffice" })
  @ApiOkResponse({ type: CityEntity })
  getCity(@Param("id") cityId: string): Promise<CityEntity> {
    return this.adminService.getCityDetail(cityId);
  }

  @Post("cities")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Create city for admin backoffice" })
  @ApiOkResponse({ type: CityEntity })
  createCity(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCityDto,
  ): Promise<CityEntity> {
    return this.adminService.createCity(user.sub, dto);
  }

  @Patch("cities/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update city and activation state" })
  @ApiOkResponse({ type: CityEntity })
  updateCity(
    @CurrentUser() user: JwtPayload,
    @Param("id") cityId: string,
    @Body() dto: UpdateCityDto,
  ): Promise<CityEntity> {
    return this.adminService.updateCity(cityId, dto, user.sub);
  }

  @Get("tariffs")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List tariffs for admin backoffice" })
  @ApiOkResponse({ type: TariffEntity, isArray: true })
  listTariffs(@Query() query: ListTariffsQueryDto): Promise<TariffEntity[]> {
    return this.adminService.listTariffs(query);
  }

  @Get("tariffs/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get tariff details for admin backoffice" })
  @ApiOkResponse({ type: TariffEntity })
  getTariff(@Param("id") tariffId: string): Promise<TariffEntity> {
    return this.adminService.getTariffDetail(tariffId);
  }

  @Patch("tariffs/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update tariff with versioning" })
  @ApiOkResponse({ type: TariffEntity })
  updateTariff(
    @CurrentUser() user: JwtPayload,
    @Param("id") tariffId: string,
    @Body() dto: UpdateTariffDto,
  ): Promise<TariffEntity> {
    return this.adminService.updateTariff(tariffId, user.sub, dto);
  }

  @Get("orders")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List orders with admin filters and pagination" })
  @ApiOkResponse({ type: AdminOrdersResponseDto })
  listOrders(
    @Query() query: AdminOrdersQueryDto,
  ): Promise<AdminOrdersResponseDto> {
    return this.adminService.listOrders(query);
  }

  @Get("orders/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get order details for admin backoffice" })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  getOrderDetail(@Param("id") orderId: string): Promise<AdminOrderDetailDto> {
    return this.adminService.getOrderDetail(orderId);
  }

  @Patch("orders/:id/assign")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Manually assign executor to searching order" })
  @ApiOkResponse({ type: AdminOrderSummaryDto })
  assignOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: AssignOrderDto,
  ): Promise<AdminOrderSummaryDto> {
    return this.adminService.assignOrder(orderId, dto, user.sub);
  }

  @Post("orders/:id/dispatch/retry")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({
    summary: "Restart dispatch for searching order from admin backoffice",
  })
  @ApiOkResponse({ type: AdminOrderSummaryDto })
  restartOrderDispatch(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<AdminOrderSummaryDto> {
    return this.adminService.restartOrderDispatch(orderId, user.sub);
  }

  @Patch("orders/:id/status")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({
    summary: "Force allowed terminal order status from admin backoffice",
  })
  @ApiOkResponse({ type: AdminOrderSummaryDto })
  updateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: UpdateAdminOrderStatusDto,
  ): Promise<AdminOrderSummaryDto> {
    return this.adminService.updateOrderStatus(orderId, dto, user.sub);
  }

  @Get("notes")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({
    summary:
      "List internal admin notes with entity, marker and priority filters",
  })
  @ApiOkResponse({ type: AdminNoteDto, isArray: true })
  listNotes(@Query() query: ListAdminNotesQueryDto): Promise<AdminNoteDto[]> {
    return this.adminService.listNotes(query);
  }

  @Get("activity")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List admin activity log for operator actions" })
  @ApiOkResponse({ type: AdminActivityDto, isArray: true })
  listActivity(
    @Query() query: ListAdminActivityQueryDto,
  ): Promise<AdminActivityDto[]> {
    return this.adminService.listActivity(query);
  }

  @Post("notes")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({
    summary: "Create internal admin note with handoff or escalation marker",
  })
  @ApiOkResponse({ type: AdminNoteDto })
  createNote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAdminNoteDto,
  ): Promise<AdminNoteDto> {
    return this.adminService.createNote(user.sub, dto);
  }

  @Patch("notes/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({
    summary: "Update internal admin note lifecycle, assignee and priority",
  })
  @ApiOkResponse({ type: AdminNoteDto })
  updateNote(
    @CurrentUser() user: JwtPayload,
    @Param("id") noteId: string,
    @Body() dto: UpdateAdminNoteDto,
  ): Promise<AdminNoteDto> {
    return this.adminService.updateNote(noteId, user.sub, dto);
  }

  @Get("users")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List users for admin backoffice" })
  @ApiOkResponse({ type: UserEntity, isArray: true })
  listUsers(@Query() query: ListUsersQueryDto): Promise<UserEntity[]> {
    return this.adminService.listUsers(query);
  }

  @Get("users/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get user details for admin backoffice" })
  @ApiOkResponse({ type: UserEntity })
  getUser(@Param("id") userId: string): Promise<UserEntity> {
    return this.adminService.getUser(userId);
  }

  @Patch("users/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update or block user through admin backoffice" })
  @ApiOkResponse({ type: UserEntity })
  updateUser(
    @CurrentUser() user: JwtPayload,
    @Param("id") userId: string,
    @Body() dto: UpdateAdminUserDto,
  ): Promise<UserEntity> {
    return this.adminService.updateUser(userId, dto, user.sub);
  }

  @Get("executors")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List executors for admin backoffice" })
  @ApiOkResponse({ type: ExecutorEntity, isArray: true })
  listExecutors(
    @Query() query: ListExecutorsQueryDto,
  ): Promise<ExecutorEntity[]> {
    return this.adminService.listExecutors(query);
  }

  @Get("executors/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get executor details for admin backoffice" })
  @ApiOkResponse({ type: ExecutorEntity })
  getExecutor(@Param("id") executorId: string): Promise<ExecutorEntity> {
    return this.adminService.getExecutor(executorId);
  }

  @Patch("executors/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update executor profile from admin backoffice" })
  @ApiOkResponse({ type: ExecutorEntity })
  updateExecutor(
    @CurrentUser() user: JwtPayload,
    @Param("id") executorId: string,
    @Body() dto: UpdateAdminExecutorDto,
  ): Promise<ExecutorEntity> {
    return this.adminService.updateExecutor(executorId, dto, user.sub);
  }

  @Patch("executors/:id/verify")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Verify executor through admin panel" })
  @ApiOkResponse({ type: ExecutorEntity })
  verifyExecutorLegacy(
    @CurrentUser() user: JwtPayload,
    @Param("id") executorId: string,
    @Body() dto: VerifyExecutorDto,
  ): Promise<ExecutorEntity> {
    return this.adminService.verifyExecutor(executorId, user.sub, dto);
  }

  @Post("executors/:id/verify")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Verify executor through admin API" })
  @ApiOkResponse({ type: ExecutorEntity })
  verifyExecutor(
    @CurrentUser() user: JwtPayload,
    @Param("id") executorId: string,
    @Body() dto: VerifyExecutorDto,
  ): Promise<ExecutorEntity> {
    return this.adminService.verifyExecutor(executorId, user.sub, dto);
  }

  @Post("executors/:id/block")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Block or unblock executor through admin API" })
  @ApiOkResponse({ type: ExecutorEntity })
  blockExecutor(
    @CurrentUser() user: JwtPayload,
    @Param("id") executorId: string,
    @Body() dto: BlockEntityDto,
  ): Promise<ExecutorEntity> {
    return this.adminService.blockExecutor(
      executorId,
      user.sub,
      dto.isBlocked ?? true,
    );
  }

  @Get("executor-balance-topups")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List executor balance top-up requests" })
  @ApiOkResponse({ type: ExecutorBalanceTopUpEntity, isArray: true })
  listExecutorBalanceTopUps(
    @Query("status") status?: "pending" | "invoiced" | "confirmed" | "rejected",
  ): Promise<ExecutorBalanceTopUpEntity[]> {
    return this.adminService.listExecutorBalanceTopUps(status);
  }

  @Patch("executor-balance-topups/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update executor balance top-up request" })
  @ApiOkResponse({ type: ExecutorBalanceTopUpEntity })
  updateExecutorBalanceTopUp(
    @CurrentUser() user: JwtPayload,
    @Param("id") topUpId: string,
    @Body() dto: UpdateBalanceTopUpDto,
  ): Promise<ExecutorBalanceTopUpEntity> {
    return this.adminService.updateExecutorBalanceTopUp(topUpId, dto, user.sub);
  }

  @Get("executor-payouts")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List executor payout requests" })
  @ApiOkResponse({ type: ExecutorPayoutEntity, isArray: true })
  listExecutorPayouts(
    @Query("status") status?: "pending" | "paid" | "rejected",
  ): Promise<ExecutorPayoutEntity[]> {
    return this.adminService.listExecutorPayouts(status);
  }

  @Post("executor-payouts")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Create executor payout request" })
  @ApiOkResponse({ type: ExecutorPayoutEntity })
  createExecutorPayout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExecutorPayoutDto,
  ): Promise<ExecutorPayoutEntity> {
    return this.adminService.createExecutorPayout(dto, user.sub);
  }

  @Patch("executor-payouts/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update executor payout request" })
  @ApiOkResponse({ type: ExecutorPayoutEntity })
  updateExecutorPayout(
    @CurrentUser() user: JwtPayload,
    @Param("id") payoutId: string,
    @Body() dto: UpdateExecutorPayoutDto,
  ): Promise<ExecutorPayoutEntity> {
    return this.adminService.updateExecutorPayout(payoutId, dto, user.sub);
  }

  @Get("promo-codes")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List promo codes" })
  @ApiOkResponse({ type: PromoCodeEntity, isArray: true })
  listPromoCodes(): Promise<PromoCodeEntity[]> {
    return this.adminService.listPromoCodes();
  }

  @Get("promo-codes/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get promo code details" })
  @ApiOkResponse({ type: PromoCodeEntity })
  getPromoCode(@Param("id") promoCodeId: string): Promise<PromoCodeEntity> {
    return this.adminService.getPromoCodeDetail(promoCodeId);
  }

  @Get("promo-codes/:id/analytics")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get promo code analytics for admin backoffice" })
  @ApiOkResponse({ type: PromoCodeAnalyticsDto })
  getPromoCodeAnalytics(
    @Param("id") promoCodeId: string,
    @Query() query: PromoCodeAnalyticsQueryDto,
  ): Promise<PromoCodeAnalyticsDto> {
    return this.adminService.getPromoCodeAnalytics(promoCodeId, query);
  }

  @Post("promo-codes")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Create promo code" })
  @ApiOkResponse({ type: PromoCodeEntity })
  createPromoCode(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    return this.adminService.createPromoCode(user.sub, dto);
  }

  @Patch("promo-codes/:id")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Update promo code" })
  @ApiOkResponse({ type: PromoCodeEntity })
  updatePromoCode(
    @CurrentUser() user: JwtPayload,
    @Param("id") promoCodeId: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    return this.adminService.updatePromoCode(promoCodeId, dto, user.sub);
  }

  @Post("payments/:id/refund")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Refund payment through admin API" })
  @ApiOkResponse({ type: PaymentResponseDto })
  refundPayment(
    @CurrentUser() user: JwtPayload,
    @Param("id") paymentId: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.adminService.refundPayment(paymentId, dto, user.sub);
  }

  @Post("payments/:id/cancel")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Cancel authorized payment through admin API" })
  @ApiOkResponse({ type: PaymentResponseDto })
  cancelPayment(
    @CurrentUser() user: JwtPayload,
    @Param("id") paymentId: string,
    @Body() dto: CancelPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.adminService.cancelPayment(paymentId, dto, user.sub);
  }

  @Get("reports/financial")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: "Get financial report for backoffice" })
  @ApiOkResponse({ type: FinancialReportDto })
  getFinancialReport(
    @Query() query: ReportQueryDto,
  ): Promise<FinancialReportDto> {
    return this.adminService.getFinancialReport(query);
  }

  @Get("reports/operations")
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get operations report for backoffice" })
  @ApiOkResponse({ type: OperationsReportDto })
  getOperationsReport(
    @Query() query: ReportQueryDto,
  ): Promise<OperationsReportDto> {
    return this.adminService.getOperationsReport(query);
  }
}
