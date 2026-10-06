import Link from "next/link";

import { AppFrame } from "../../components/app-frame";
import { FlashBanner } from "../../components/flash-banner";
import { InternalActivityPanel } from "../../components/internal-activity-panel";
import { InternalNotesPanel } from "../../components/internal-notes-panel";
import { MetricCard } from "../../components/metric-card";
import { SectionShell } from "../../components/section-shell";
import { StatusPill } from "../../components/status-pill";
import {
  cancelPaymentAction,
  assignOrderAction,
  refundPaymentAction,
  restartOrderDispatchAction,
  updateOrderStatusAction,
} from "../../lib/admin-actions";
import {
  getAdminPageContext,
  translateDeliveryStatus,
  translateExecutorType,
  translateOrderStatus,
  translatePaymentMethod,
  translatePaymentStatus,
  translateServiceType,
  translateVehicleType,
  translateVerificationStatus,
} from "../../lib/admin-i18n";
import {
  getSearchParam,
  resolveRouteSearchParams,
} from "../../lib/admin-routing";
import {
  AdminOrderDetailSnapshot,
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getExecutorsSnapshot,
  getOrderDetailSnapshot,
} from "../../lib/backoffice";
import {
  cityPrimaryName,
  formatDate,
  formatDateNullable,
  formatDistance,
  formatDuration,
  formatMoney,
  orderTone,
  routeLabel,
} from "../../lib/backoffice-view";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

type DetailItemProps = {
  label: string;
  value: React.ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <div className="detail-item__value">{value}</div>
    </div>
  );
}

function yesNo(value: boolean, yesLabel: string, noLabel: string): string {
  return value ? yesLabel : noLabel;
}

function paymentTone(
  status: AdminOrderDetailSnapshot["payments"][number]["status"],
): "success" | "warning" | "danger" | "neutral" | "brand" {
  if (status === "captured" || status === "refunded") {
    return "success";
  }

  if (status === "pending" || status === "authorized") {
    return "warning";
  }

  if (status === "failed" || status === "cancelled") {
    return "danger";
  }

  if (status === "partially_refunded") {
    return "brand";
  }

  return "neutral";
}

function renderMetadata(
  value: Record<string, unknown> | null,
): React.ReactNode {
  if (!value || Object.keys(value).length === 0) {
    return "—";
  }

  return <pre className="detail-code">{JSON.stringify(value, null, 2)}</pre>;
}

function refundableAmount(
  payment: AdminOrderDetailSnapshot["payments"][number],
): number {
  return Math.max(0, Number(payment.amount) - Number(payment.refundedAmount));
}

function getOrderResolutionStatuses(
  status: AdminOrderDetailSnapshot["status"],
): AdminOrderDetailSnapshot["status"][] {
  switch (status) {
    case "draft":
      return ["cancelled_system"];
    case "searching":
    case "accepted":
    case "in_progress":
      return ["cancelled_system", "failed"];
    case "arriving":
    case "waiting":
      return ["failed"];
    default:
      return [];
  }
}

function OrderOverview({
  order,
  locale,
  labels,
}: {
  order: AdminOrderDetailSnapshot;
  locale: "ru" | "kk";
  labels: Awaited<ReturnType<typeof getAdminPageContext>>["dictionary"];
}) {
  return (
    <div className="detail-grid">
      <DetailItem label={labels.forms.orderId} value={order.id} />
      <DetailItem
        label={labels.forms.serviceType}
        value={translateServiceType(order.serviceType, labels)}
      />
      <DetailItem
        label={labels.forms.status}
        value={translateOrderStatus(order.status, labels)}
      />
      <DetailItem
        label={labels.forms.payment}
        value={translatePaymentMethod(order.paymentMethod, labels)}
      />
      <DetailItem
        label={labels.forms.amount}
        value={formatMoney(
          order.finalPrice ?? order.estimatedPrice ?? 0,
          order.currency,
          locale,
        )}
      />
      <DetailItem
        label={labels.forms.discountAmount}
        value={formatMoney(order.discountAmount, order.currency, locale)}
      />
      <DetailItem
        label={labels.forms.pickup}
        value={order.pickupAddress ?? "—"}
      />
      <DetailItem
        label={labels.forms.destination}
        value={order.destinationAddress ?? "—"}
      />
      <DetailItem
        label={labels.forms.distance}
        value={formatDistance(order.distanceMeters, locale)}
      />
      <DetailItem
        label={labels.forms.duration}
        value={formatDuration(order.durationSeconds, locale)}
      />
      <DetailItem
        label={labels.forms.createdAt}
        value={formatDate(order.createdAt, locale)}
      />
      <DetailItem
        label={labels.forms.updatedAt}
        value={formatDate(order.updatedAt, locale)}
      />
      <DetailItem
        label={labels.forms.acceptedAt}
        value={formatDateNullable(order.acceptedAt, locale)}
      />
      <DetailItem
        label={labels.forms.startedAt}
        value={formatDateNullable(order.startedAt, locale)}
      />
      <DetailItem
        label={labels.forms.completedAt}
        value={formatDateNullable(order.completedAt, locale)}
      />
      <DetailItem
        label={labels.forms.cancelledAt}
        value={formatDateNullable(order.cancelledAt, locale)}
      />
      <DetailItem
        label={labels.forms.cancelReason}
        value={order.cancelReason ?? "—"}
      />
      <DetailItem
        label={labels.forms.clientRating}
        value={order.clientRating ?? "—"}
      />
      <DetailItem
        label={labels.forms.executorRating}
        value={order.executorRating ?? "—"}
      />
    </div>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const [snapshot, order, notes, activity] = await Promise.all([
    getBackofficeSnapshot(),
    getOrderDetailSnapshot(resolvedParams.id),
    getAdminNotesSnapshot({
      entityType: "order",
      entityId: resolvedParams.id,
    }),
    getAdminActivitySnapshot({
      entityType: "order",
      entityId: resolvedParams.id,
      limit: 6,
    }),
  ]);
  const candidateExecutors =
    order && order.status === "searching"
      ? await getExecutorsSnapshot({
          cityId: order.cityId,
          verificationStatus: "verified",
          isBlocked: false,
          limit: 50,
        })
      : [];
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const backHref = `/orders?lang=${locale}`;
  const returnPath = `/orders/${resolvedParams.id}?lang=${locale}`;
  const resolutionStatuses = order
    ? getOrderResolutionStatuses(order.status)
    : [];
  const cancellablePayments = order
    ? order.payments.filter((payment) => payment.status === "authorized")
    : [];
  const refundablePayments = order
    ? order.payments.filter((payment) => {
        const remainingAmount = refundableAmount(payment);
        return (
          remainingAmount > 0 &&
          (payment.status === "captured" ||
            payment.status === "partially_refunded")
        );
      })
    : [];
  const showActions =
    resolutionStatuses.length > 0 ||
    Boolean(order && order.status === "searching") ||
    cancellablePayments.length > 0 ||
    refundablePayments.length > 0;

  return (
    <AppFrame
      current="orders"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.orderDetailPage.eyebrow}
          title={
            order
              ? dictionary.orderDetailPage.title(order.id)
              : dictionary.orderDetailPage.notFoundTitle
          }
          description={
            order
              ? routeLabel(order) || dictionary.orderDetailPage.description
              : dictionary.orderDetailPage.notFoundDescription
          }
          aside={
            <Link
              href={backHref}
              className="action-button action-button--ghost"
            >
              {dictionary.orderDetailPage.backToOrders}
            </Link>
          }
        >
          {order ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.forms.status}
                value={translateOrderStatus(order.status, dictionary)}
                hint={translateServiceType(order.serviceType, dictionary)}
                accent="gold"
              />
              <MetricCard
                label={dictionary.forms.amount}
                value={formatMoney(
                  order.finalPrice ?? order.estimatedPrice ?? 0,
                  order.currency,
                  locale,
                )}
                hint={translatePaymentMethod(order.paymentMethod, dictionary)}
                accent="teal"
              />
              <MetricCard
                label={dictionary.forms.city}
                value={
                  order.city
                    ? cityPrimaryName(order.city, locale)
                    : order.cityId
                }
                hint={formatDate(order.createdAt, locale)}
                accent="ink"
              />
              <MetricCard
                label={dictionary.forms.executor}
                value={
                  order.executor?.name ??
                  dictionary.orderDetailPage.missingExecutor
                }
                hint={order.executor?.id ?? "—"}
                accent="ember"
              />
            </section>
          ) : (
            <p className="empty-state">
              {dictionary.orderDetailPage.notFoundDescription}
            </p>
          )}
        </SectionShell>

        {order ? (
          <>
            {showActions ? (
              <SectionShell
                eyebrow={dictionary.orderDetailPage.eyebrow}
                title={dictionary.orderDetailPage.actionsTitle}
                description={dictionary.orderDetailPage.actionsDescription}
              >
                <div className="detail-grid detail-grid--double">
                  {resolutionStatuses.length > 0 ? (
                    <article className="detail-card">
                      <h3>{dictionary.forms.status}</h3>
                      <p className="detail-card__description">
                        {dictionary.orderDetailPage.statusUpdateHint}
                      </p>
                      <form
                        action={updateOrderStatusAction}
                        className="admin-form"
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="returnPath"
                          value={returnPath}
                        />
                        <input type="hidden" name="orderId" value={order.id} />
                        <div className="admin-form__grid">
                          <label className="field">
                            <span>{dictionary.forms.status}</span>
                            <select name="status" required defaultValue="">
                              <option value="">
                                {dictionary.forms.allStates}
                              </option>
                              {resolutionStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {translateOrderStatus(status, dictionary)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>{dictionary.forms.reason}</span>
                            <input name="reason" />
                          </label>
                        </div>
                        <div className="button-row">
                          <button type="submit" className="action-button">
                            {dictionary.forms.apply}
                          </button>
                        </div>
                      </form>
                    </article>
                  ) : null}

                  {order.status === "searching" ? (
                    <article className="detail-card">
                      <h3>{dictionary.forms.retry}</h3>
                      <p className="detail-card__description">
                        {dictionary.orderDetailPage.redispatchHint}
                      </p>
                      <form
                        action={restartOrderDispatchAction}
                        className="admin-form"
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input
                          type="hidden"
                          name="returnPath"
                          value={returnPath}
                        />
                        <input type="hidden" name="orderId" value={order.id} />
                        <div className="button-row">
                          <button type="submit" className="action-button">
                            {dictionary.forms.retry}
                          </button>
                        </div>
                      </form>
                    </article>
                  ) : null}

                  {order.status === "searching" ? (
                    <article className="detail-card">
                      <h3>{dictionary.ordersPage.assignTitle}</h3>
                      <p className="detail-card__description">
                        {dictionary.ordersPage.assignDescription}
                      </p>
                      {candidateExecutors.length > 0 ? (
                        <form action={assignOrderAction} className="admin-form">
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="returnPath"
                            value={returnPath}
                          />
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <div className="admin-form__grid">
                            <label className="field">
                              <span>{dictionary.forms.executor}</span>
                              <select
                                name="executorId"
                                required
                                defaultValue=""
                              >
                                <option value="">
                                  {dictionary.forms.allStates}
                                </option>
                                {candidateExecutors.map((executor) => (
                                  <option key={executor.id} value={executor.id}>
                                    {[
                                      executor.user?.name ?? executor.id,
                                      executor.id,
                                      executor.vehicleType
                                        ? translateVehicleType(
                                            executor.vehicleType,
                                            dictionary,
                                          )
                                        : (executor.carClass ??
                                          translateExecutorType(
                                            executor.executorType,
                                            dictionary,
                                          )),
                                    ].join(" · ")}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="button-row">
                            <button type="submit" className="action-button">
                              {dictionary.forms.assign}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="empty-state">
                          {dictionary.orderDetailPage.noVerifiedExecutors}
                        </p>
                      )}
                    </article>
                  ) : null}

                  {cancellablePayments.length > 0 ? (
                    <article className="detail-card">
                      <h3>{dictionary.forms.cancel}</h3>
                      <p className="detail-card__description">
                        {dictionary.orderDetailPage.cancellableHint}
                      </p>
                      <div className="detail-stack">
                        {cancellablePayments.map((payment) => (
                          <form
                            key={payment.id}
                            action={cancelPaymentAction}
                            className="admin-form detail-inline-form"
                          >
                            <input type="hidden" name="locale" value={locale} />
                            <input
                              type="hidden"
                              name="returnPath"
                              value={returnPath}
                            />
                            <input
                              type="hidden"
                              name="paymentId"
                              value={payment.id}
                            />
                            <div className="route-point__header">
                              <strong>{payment.id}</strong>
                              <StatusPill tone={paymentTone(payment.status)}>
                                {translatePaymentStatus(
                                  payment.status,
                                  dictionary,
                                )}
                              </StatusPill>
                            </div>
                            <div className="detail-grid">
                              <DetailItem
                                label={dictionary.forms.amount}
                                value={formatMoney(
                                  payment.amount,
                                  payment.currency,
                                  locale,
                                )}
                              />
                              <DetailItem
                                label={dictionary.forms.payment}
                                value={translatePaymentStatus(
                                  payment.status,
                                  dictionary,
                                )}
                              />
                            </div>
                            <div className="admin-form__grid">
                              <label className="field">
                                <span>{dictionary.forms.reason}</span>
                                <input name="reason" />
                              </label>
                            </div>
                            <div className="button-row">
                              <button type="submit" className="action-button">
                                {dictionary.forms.cancel}
                              </button>
                            </div>
                          </form>
                        ))}
                      </div>
                    </article>
                  ) : null}

                  {refundablePayments.length > 0 ? (
                    <article className="detail-card">
                      <h3>{dictionary.forms.refund}</h3>
                      <p className="detail-card__description">
                        {dictionary.orderDetailPage.refundableHint}
                      </p>
                      <div className="detail-stack">
                        {refundablePayments.map((payment) => {
                          const remainingAmount = refundableAmount(payment);
                          return (
                            <form
                              key={payment.id}
                              action={refundPaymentAction}
                              className="admin-form detail-inline-form"
                            >
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="returnPath"
                                value={returnPath}
                              />
                              <input
                                type="hidden"
                                name="paymentId"
                                value={payment.id}
                              />
                              <div className="route-point__header">
                                <strong>{payment.id}</strong>
                                <StatusPill tone={paymentTone(payment.status)}>
                                  {translatePaymentStatus(
                                    payment.status,
                                    dictionary,
                                  )}
                                </StatusPill>
                              </div>
                              <div className="detail-grid">
                                <DetailItem
                                  label={dictionary.forms.amount}
                                  value={formatMoney(
                                    payment.amount,
                                    payment.currency,
                                    locale,
                                  )}
                                />
                                <DetailItem
                                  label={dictionary.forms.refundedAmount}
                                  value={formatMoney(
                                    payment.refundedAmount,
                                    payment.currency,
                                    locale,
                                  )}
                                />
                                <DetailItem
                                  label={dictionary.forms.refundAmount}
                                  value={formatMoney(
                                    remainingAmount,
                                    payment.currency,
                                    locale,
                                  )}
                                />
                              </div>
                              <div className="admin-form__grid">
                                <label className="field">
                                  <span>{dictionary.forms.refundAmount}</span>
                                  <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    max={remainingAmount.toFixed(2)}
                                    step="0.01"
                                    placeholder={remainingAmount.toFixed(2)}
                                  />
                                </label>
                                <label className="field">
                                  <span>{dictionary.forms.reason}</span>
                                  <input name="reason" />
                                </label>
                              </div>
                              <div className="button-row">
                                <button type="submit" className="action-button">
                                  {dictionary.forms.refund}
                                </button>
                              </div>
                            </form>
                          );
                        })}
                      </div>
                    </article>
                  ) : null}
                </div>
              </SectionShell>
            ) : null}

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.overviewTitle}
              description={dictionary.orderDetailPage.overviewDescription}
              aside={
                <StatusPill tone={orderTone(order.status)}>
                  {translateOrderStatus(order.status, dictionary)}
                </StatusPill>
              }
            >
              <OrderOverview
                order={order}
                locale={locale}
                labels={dictionary}
              />
            </SectionShell>

            <InternalNotesPanel
              notes={notes}
              entityType="order"
              entityId={order.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={returnPath}
            />

            <InternalActivityPanel
              activity={activity}
              entityType="order"
              entityId={order.id}
              locale={locale}
              dictionary={dictionary}
            />

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.actorsTitle}
              description={dictionary.orderDetailPage.actorsDescription}
            >
              <div className="detail-grid detail-grid--double">
                <article className="detail-card">
                  <h3>{dictionary.forms.client}</h3>
                  <div className="detail-grid">
                    <DetailItem
                      label={dictionary.forms.name}
                      value={order.client?.name ?? "—"}
                    />
                    <DetailItem
                      label={dictionary.forms.phone}
                      value={order.client?.phone ?? "—"}
                    />
                    <DetailItem
                      label={dictionary.forms.blockedState}
                      value={yesNo(
                        Boolean(order.client?.isBlocked),
                        dictionary.orderDetailPage.yes,
                        dictionary.orderDetailPage.no,
                      )}
                    />
                  </div>
                  {order.client ? (
                    <div className="button-row">
                      <Link
                        href={`/users/${order.client.id}?lang=${locale}`}
                        className="action-button action-button--ghost"
                      >
                        {dictionary.shell.open}
                      </Link>
                    </div>
                  ) : null}
                </article>

                <article className="detail-card">
                  <h3>{dictionary.forms.executor}</h3>
                  {order.executor ? (
                    <>
                      <div className="detail-grid">
                        <DetailItem
                          label={dictionary.forms.name}
                          value={order.executor.name ?? "—"}
                        />
                        <DetailItem
                          label={dictionary.forms.phone}
                          value={order.executor.phone}
                        />
                        <DetailItem
                          label={dictionary.forms.executorType}
                          value={translateExecutorType(
                            order.executor.executorType,
                            dictionary,
                          )}
                        />
                        <DetailItem
                          label={dictionary.forms.vehicleType}
                          value={
                            order.executor.vehicleType
                              ? translateVehicleType(
                                  order.executor.vehicleType,
                                  dictionary,
                                )
                              : (order.executor.carClass ?? "—")
                          }
                        />
                        <DetailItem
                          label={dictionary.forms.onlineState}
                          value={yesNo(
                            order.executor.isOnline,
                            dictionary.orderDetailPage.yes,
                            dictionary.orderDetailPage.no,
                          )}
                        />
                        <DetailItem
                          label={dictionary.forms.verificationStatus}
                          value={translateVerificationStatus(
                            order.executor.verificationStatus,
                            dictionary,
                          )}
                        />
                      </div>
                      <div className="button-row">
                        <Link
                          href={`/executors/${order.executor.id}?lang=${locale}`}
                          className="action-button action-button--ghost"
                        >
                          {dictionary.shell.open}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="empty-state">
                      {dictionary.orderDetailPage.missingExecutor}
                    </p>
                  )}
                </article>
              </div>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.routeTitle}
              description={dictionary.orderDetailPage.routeDescription}
            >
              <div className="route-list">
                {order.routePoints.map((point, index) => (
                  <article key={point.id} className="route-point">
                    <header className="route-point__header">
                      <strong>
                        {dictionary.orderDetailPage.routePointLabel(index)}
                      </strong>
                      <StatusPill tone="neutral">{point.id}</StatusPill>
                    </header>
                    <div className="detail-grid">
                      <DetailItem
                        label={dictionary.forms.address}
                        value={point.address}
                      />
                      <DetailItem
                        label={dictionary.forms.contact}
                        value={
                          point.contactName || point.contactPhone
                            ? [point.contactName, point.contactPhone]
                                .filter(Boolean)
                                .join(" · ")
                            : "—"
                        }
                      />
                      <DetailItem
                        label={dictionary.forms.arrivedAt}
                        value={formatDateNullable(point.arrivedAt, locale)}
                      />
                      <DetailItem
                        label={dictionary.forms.completedAt}
                        value={formatDateNullable(point.completedAt, locale)}
                      />
                      <DetailItem
                        label={dictionary.forms.notes}
                        value={point.notes ?? "—"}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.deliveryTitle}
              description={dictionary.orderDetailPage.deliveryDescription}
            >
              {order.delivery ? (
                <div className="detail-grid">
                  <DetailItem
                    label={dictionary.forms.vehicleType}
                    value={translateVehicleType(
                      order.delivery.courierVehicleType,
                      dictionary,
                    )}
                  />
                  <DetailItem
                    label={dictionary.forms.status}
                    value={translateDeliveryStatus(
                      order.delivery.deliveryStatus,
                      dictionary,
                    )}
                  />
                  <DetailItem
                    label={dictionary.forms.packageDescription}
                    value={order.delivery.packageDescription ?? "—"}
                  />
                  <DetailItem
                    label={dictionary.forms.declaredValue}
                    value={
                      order.delivery.declaredValue
                        ? formatMoney(
                            order.delivery.declaredValue,
                            order.currency,
                            locale,
                          )
                        : "—"
                    }
                  />
                  <DetailItem
                    label={dictionary.forms.fragile}
                    value={yesNo(
                      order.delivery.isFragile,
                      dictionary.orderDetailPage.yes,
                      dictionary.orderDetailPage.no,
                    )}
                  />
                  <DetailItem
                    label={dictionary.forms.requiresReturn}
                    value={yesNo(
                      order.delivery.requiresReturn,
                      dictionary.orderDetailPage.yes,
                      dictionary.orderDetailPage.no,
                    )}
                  />
                  <DetailItem
                    label={dictionary.forms.cashOnDelivery}
                    value={
                      order.delivery.cashOnDelivery
                        ? formatMoney(
                            order.delivery.cashOnDelivery,
                            order.currency,
                            locale,
                          )
                        : "—"
                    }
                  />
                  <DetailItem
                    label={dictionary.forms.recipientCode}
                    value={order.delivery.recipientCode ?? "—"}
                  />
                  <DetailItem
                    label={dictionary.forms.proofPhoto}
                    value={
                      order.delivery.proofPhotoUrl ? (
                        <a
                          href={order.delivery.proofPhotoUrl}
                          className="table-link"
                        >
                          {dictionary.shell.open}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailItem
                    label={dictionary.forms.packagePhoto}
                    value={
                      order.delivery.packagePhotoUrl ? (
                        <a
                          href={order.delivery.packagePhotoUrl}
                          className="table-link"
                        >
                          {dictionary.shell.open}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
              ) : (
                <p className="empty-state">
                  {dictionary.orderDetailPage.missingDelivery}
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.paymentsTitle}
              description={dictionary.orderDetailPage.paymentsDescription}
            >
              {order.payments.length > 0 ? (
                <div className="detail-stack">
                  {order.payments.map((payment) => (
                    <article key={payment.id} className="detail-card">
                      <header className="route-point__header">
                        <strong>{payment.id}</strong>
                        <StatusPill tone={paymentTone(payment.status)}>
                          {translatePaymentStatus(payment.status, dictionary)}
                        </StatusPill>
                      </header>
                      <div className="detail-grid">
                        <DetailItem
                          label={dictionary.forms.amount}
                          value={formatMoney(
                            payment.amount,
                            payment.currency,
                            locale,
                          )}
                        />
                        <DetailItem
                          label={dictionary.forms.payment}
                          value={translatePaymentMethod(
                            payment.method,
                            dictionary,
                          )}
                        />
                        <DetailItem
                          label={dictionary.forms.provider}
                          value={payment.provider ?? "—"}
                        />
                        <DetailItem
                          label={dictionary.forms.providerTransactionId}
                          value={payment.providerTransactionId ?? "—"}
                        />
                        <DetailItem
                          label={dictionary.forms.refundedAmount}
                          value={formatMoney(
                            payment.refundedAmount,
                            payment.currency,
                            locale,
                          )}
                        />
                        <DetailItem
                          label={dictionary.forms.capturedAt}
                          value={formatDateNullable(payment.capturedAt, locale)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  {dictionary.orderDetailPage.missingPayments}
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.orderDetailPage.eyebrow}
              title={dictionary.orderDetailPage.timelineTitle}
              description={dictionary.orderDetailPage.timelineDescription}
            >
              {order.statusEvents.length > 0 ? (
                <div className="timeline-list">
                  {order.statusEvents.map((event) => (
                    <article key={event.id} className="timeline-item">
                      <header className="route-point__header">
                        <strong>
                          {translateOrderStatus(event.toStatus, dictionary)}
                        </strong>
                        <span className="timeline-item__date">
                          {formatDate(event.createdAt, locale)}
                        </span>
                      </header>
                      <div className="detail-grid">
                        <DetailItem
                          label={dictionary.forms.status}
                          value={
                            event.fromStatus
                              ? `${translateOrderStatus(event.fromStatus, dictionary)} -> ${translateOrderStatus(event.toStatus, dictionary)}`
                              : translateOrderStatus(event.toStatus, dictionary)
                          }
                        />
                        <DetailItem
                          label={dictionary.forms.actorId}
                          value={event.actorId ?? "—"}
                        />
                        <DetailItem
                          label={dictionary.forms.metadata}
                          value={renderMetadata(event.metadata)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  {dictionary.orderDetailPage.missingTimeline}
                </p>
              )}
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
