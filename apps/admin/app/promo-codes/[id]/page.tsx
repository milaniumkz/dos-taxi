import Link from 'next/link';

import { AppFrame } from '../../components/app-frame';
import { FlashBanner } from '../../components/flash-banner';
import { InternalActivityPanel } from '../../components/internal-activity-panel';
import { InternalNotesPanel } from '../../components/internal-notes-panel';
import { MetricCard } from '../../components/metric-card';
import { OrdersTable } from '../../components/orders-table';
import { SectionShell } from '../../components/section-shell';
import { StatusPill } from '../../components/status-pill';
import { updatePromoCodeAction } from '../../lib/admin-actions';
import {
  getAdminPageContext,
  translateOrderStatus,
  translatePaymentMethod,
  translatePeriod,
  translateServiceType,
} from '../../lib/admin-i18n';
import {
  buildPathWithOverrides,
  getSearchParam,
  resolveRouteSearchParams,
} from '../../lib/admin-routing';
import {
  type AdminOrderSnapshot,
  type CitySnapshot,
  type OrderStatus,
  type PaymentMethod,
  type PromoCodeAnalyticsSnapshot,
  getAdminOrdersSnapshot,
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getPromoCodeAnalyticsSnapshot,
  getPromoCodeDetailSnapshot,
} from '../../lib/backoffice';
import {
  formatDate,
  formatDateNullable,
  formatMoneyTotalsByCurrency,
  formatNumber,
} from '../../lib/backoffice-view';

type MoneyTotalsByCurrency = Record<string, number>;
const metricAccents = ['gold', 'teal', 'ink', 'ember'] as const;

type PromoCodeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string | string[];
    period?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    cityId?: string | string[];
    status?: string | string[];
    serviceType?: string | string[];
    paymentMethod?: string | string[];
    limit?: string | string[];
    cursor?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

function discountValueLabel(
  discountType: string,
  discountValue: string,
  percentLabel: string,
): string {
  return discountType === 'percent'
    ? `${discountValue}${percentLabel}`
    : discountValue;
}

function toDateTimeLocalValue(value: string | null): string {
  return value ? value.slice(0, 16) : '';
}

function normalizeDateInputValue(value: string | null | undefined): string {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function toDateStartIso(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function toDateEndIso(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function addCurrencyAmount(
  totals: MoneyTotalsByCurrency,
  currency: string,
  amount: number,
) {
  totals[currency] = (totals[currency] ?? 0) + amount;
}

function getMetricAccent(index: number): (typeof metricAccents)[number] {
  return metricAccents[index % metricAccents.length];
}

function buildPromoUsageAnalytics(
  promoCodeId: string,
  code: string | null,
  maxUses: number | null,
  relatedOrders: AdminOrderSnapshot[],
  allOrders: AdminOrderSnapshot[],
  cities: CitySnapshot[],
): PromoCodeAnalyticsSnapshot {
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const firstOrderAtByClient = new Map<string, number>();
  const uniqueClients = new Set<string>();

  for (const order of allOrders) {
    const createdAt = new Date(order.createdAt).getTime();
    const current = firstOrderAtByClient.get(order.clientId);

    if (current === undefined || createdAt < current) {
      firstOrderAtByClient.set(order.clientId, createdAt);
    }
  }

  const grossTotalsByCurrency: MoneyTotalsByCurrency = {};
  const discountTotalsByCurrency: MoneyTotalsByCurrency = {};
  const cityBreakdownMap = new Map<
    string,
    PromoCodeAnalyticsSnapshot['cityBreakdown'][number]
  >();
  const paymentMethodBreakdownMap = new Map<
    PaymentMethod,
    PromoCodeAnalyticsSnapshot['paymentMethodBreakdown'][number]
  >();
  const statusBreakdownMap = new Map<
    OrderStatus,
    PromoCodeAnalyticsSnapshot['statusBreakdown'][number]
  >();
  let completedOrders = 0;
  let taxiOrders = 0;
  let deliveryOrders = 0;
  let firstTimeRedemptions = 0;
  let repeatRedemptions = 0;
  let lastRedeemedAt: string | null = null;

  for (const order of relatedOrders) {
    const orderGross = Number(order.finalPrice ?? order.estimatedPrice ?? 0);
    const orderDiscount = Number(order.discountAmount);
    const createdAt = new Date(order.createdAt).getTime();

    uniqueClients.add(order.clientId);
    addCurrencyAmount(grossTotalsByCurrency, order.currency, orderGross);
    addCurrencyAmount(discountTotalsByCurrency, order.currency, orderDiscount);

    if (order.status === 'completed' || order.status === 'delivered') {
      completedOrders += 1;
    }
    if (order.serviceType === 'taxi') {
      taxiOrders += 1;
    } else if (order.serviceType === 'delivery') {
      deliveryOrders += 1;
    }
    if (createdAt === firstOrderAtByClient.get(order.clientId)) {
      firstTimeRedemptions += 1;
    } else {
      repeatRedemptions += 1;
    }
    if (!lastRedeemedAt || createdAt > new Date(lastRedeemedAt).getTime()) {
      lastRedeemedAt = order.createdAt;
    }

    const cityEntry =
      cityBreakdownMap.get(order.cityId) ??
      (() => {
        const city = cityById.get(order.cityId);
        const nextValue: PromoCodeAnalyticsSnapshot['cityBreakdown'][number] = {
          cityId: order.cityId,
          cityNameRu: city?.nameRu ?? order.cityId,
          cityNameKk: city?.nameKk ?? order.cityId,
          orderCount: 0,
          completedOrders: 0,
          grossTotalsByCurrency: {},
          discountTotalsByCurrency: {},
        };
        cityBreakdownMap.set(order.cityId, nextValue);
        return nextValue;
      })();

    cityEntry.orderCount += 1;
    if (order.status === 'completed' || order.status === 'delivered') {
      cityEntry.completedOrders += 1;
    }
    addCurrencyAmount(cityEntry.grossTotalsByCurrency, order.currency, orderGross);
    addCurrencyAmount(
      cityEntry.discountTotalsByCurrency,
      order.currency,
      orderDiscount,
    );

    const paymentEntry =
      paymentMethodBreakdownMap.get(order.paymentMethod) ??
      (() => {
        const nextValue: PromoCodeAnalyticsSnapshot['paymentMethodBreakdown'][number] =
          {
            paymentMethod: order.paymentMethod,
            orderCount: 0,
            grossTotalsByCurrency: {},
            discountTotalsByCurrency: {},
          };
        paymentMethodBreakdownMap.set(order.paymentMethod, nextValue);
        return nextValue;
      })();

    paymentEntry.orderCount += 1;
    addCurrencyAmount(
      paymentEntry.grossTotalsByCurrency,
      order.currency,
      orderGross,
    );
    addCurrencyAmount(
      paymentEntry.discountTotalsByCurrency,
      order.currency,
      orderDiscount,
    );

    const statusEntry =
      statusBreakdownMap.get(order.status) ??
      (() => {
        const nextValue: PromoCodeAnalyticsSnapshot['statusBreakdown'][number] = {
          status: order.status,
          orderCount: 0,
          grossTotalsByCurrency: {},
          discountTotalsByCurrency: {},
        };
        statusBreakdownMap.set(order.status, nextValue);
        return nextValue;
      })();

    statusEntry.orderCount += 1;
    addCurrencyAmount(
      statusEntry.grossTotalsByCurrency,
      order.currency,
      orderGross,
    );
    addCurrencyAmount(
      statusEntry.discountTotalsByCurrency,
      order.currency,
      orderDiscount,
    );
  }

  const totalOrders = relatedOrders.length;
  const usageRate =
    maxUses && maxUses > 0 ? (totalOrders / maxUses) * 100 : null;
  const completionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const firstOrderConversion =
    uniqueClients.size > 0
      ? (firstTimeRedemptions / uniqueClients.size) * 100
      : 0;

  return {
    promoCodeId,
    code,
    totalOrders,
    completedOrders,
    grossTotalsByCurrency,
    discountTotalsByCurrency,
    taxiOrders,
    deliveryOrders,
    uniqueClients: uniqueClients.size,
    firstTimeRedemptions,
    repeatRedemptions,
    usageRate,
    completionRate,
    firstOrderConversion,
    lastRedeemedAt,
    cityBreakdown: [...cityBreakdownMap.values()].sort(
      (left, right) =>
        right.orderCount - left.orderCount ||
        right.completedOrders - left.completedOrders ||
        left.cityNameRu.localeCompare(right.cityNameRu),
    ),
    paymentMethodBreakdown: [...paymentMethodBreakdownMap.values()].sort(
      (left, right) => right.orderCount - left.orderCount,
    ),
    statusBreakdown: [...statusBreakdownMap.values()].sort(
      (left, right) => right.orderCount - left.orderCount,
    ),
  };
}

export default async function PromoCodeDetailPage({
  params,
  searchParams,
}: PromoCodeDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const selectedPeriodRaw = getSearchParam(resolvedSearchParams, 'period') ?? '';
  const selectedPeriod =
    selectedPeriodRaw === 'day' ||
    selectedPeriodRaw === 'week' ||
    selectedPeriodRaw === 'month'
      ? selectedPeriodRaw
      : '';
  const selectedDateFrom = normalizeDateInputValue(
    getSearchParam(resolvedSearchParams, 'dateFrom'),
  );
  const selectedDateTo = normalizeDateInputValue(
    getSearchParam(resolvedSearchParams, 'dateTo'),
  );
  const scopedDateFrom = selectedDateFrom
    ? toDateStartIso(selectedDateFrom)
    : undefined;
  const scopedDateTo = selectedDateTo ? toDateEndIso(selectedDateTo) : undefined;
  const selectedCityId = getSearchParam(resolvedSearchParams, 'cityId') ?? '';
  const selectedStatusRaw = getSearchParam(resolvedSearchParams, 'status') ?? '';
  const selectedStatus = Object.prototype.hasOwnProperty.call(
    dictionary.enums.orderStatus,
    selectedStatusRaw,
  )
    ? (selectedStatusRaw as OrderStatus)
    : '';
  const selectedServiceTypeRaw =
    getSearchParam(resolvedSearchParams, 'serviceType') ?? '';
  const selectedServiceType =
    selectedServiceTypeRaw === 'taxi' ||
    selectedServiceTypeRaw === 'delivery' ||
    selectedServiceTypeRaw === 'intercity' ||
    selectedServiceTypeRaw === 'cargo' ||
    selectedServiceTypeRaw === 'scooter'
      ? selectedServiceTypeRaw
      : '';
  const selectedPaymentMethodRaw =
    getSearchParam(resolvedSearchParams, 'paymentMethod') ?? '';
  const selectedPaymentMethod =
    selectedPaymentMethodRaw === 'card' ||
    selectedPaymentMethodRaw === 'cash' ||
    selectedPaymentMethodRaw === 'corporate' ||
    selectedPaymentMethodRaw === 'bonus'
      ? (selectedPaymentMethodRaw as PaymentMethod)
      : '';
  const selectedCursor = getSearchParam(resolvedSearchParams, 'cursor') ?? '';
  const rawLimit = Number(getSearchParam(resolvedSearchParams, 'limit') ?? '25');
  const selectedLimit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 25;
  const [snapshot, promoCode, liveAnalytics, relatedOrdersResponse, activity, notes] =
    await Promise.all([
      getBackofficeSnapshot(),
      getPromoCodeDetailSnapshot(resolvedParams.id),
      getPromoCodeAnalyticsSnapshot(resolvedParams.id, {
        period: selectedPeriod || undefined,
        dateFrom: scopedDateFrom,
        dateTo: scopedDateTo,
        cityId: selectedCityId || undefined,
        status: selectedStatus || undefined,
        serviceType: selectedServiceType || undefined,
        paymentMethod: selectedPaymentMethod || undefined,
      }),
      getAdminOrdersSnapshot({
        promoCodeId: resolvedParams.id,
        period: selectedPeriod || undefined,
        dateFrom: scopedDateFrom,
        dateTo: scopedDateTo,
        cityId: selectedCityId || undefined,
        status: selectedStatus || undefined,
        serviceType: selectedServiceType || undefined,
        paymentMethod: selectedPaymentMethod || undefined,
        cursor: selectedCursor || undefined,
        limit: selectedLimit,
      }),
      getAdminActivitySnapshot({
        entityType: 'promo_code',
        entityId: resolvedParams.id,
        limit: 6,
      }),
      getAdminNotesSnapshot({
        entityType: 'promo_code',
        entityId: resolvedParams.id,
        limit: 6,
      }),
    ]);
  const backHref = `/promo-codes?lang=${locale}`;
  const promoTitle = promoCode?.code || resolvedParams.id;
  const selectedCity =
    snapshot.cities.find((city) => city.id === selectedCityId) ?? null;
  const analyticsScopeLabel =
    selectedDateFrom || selectedDateTo
      ? dictionary.promoCodeDetailPage.customRangeLabel
      : selectedPeriod
        ? translatePeriod(selectedPeriod, dictionary)
        : dictionary.promoCodeDetailPage.fullHistoryLabel;
  const selectedStatusLabel = selectedStatus
    ? translateOrderStatus(selectedStatus, dictionary)
    : null;
  const selectedServiceTypeLabel = selectedServiceType
    ? translateServiceType(selectedServiceType, dictionary)
    : null;
  const selectedPaymentMethodLabel = selectedPaymentMethod
    ? translatePaymentMethod(selectedPaymentMethod, dictionary)
    : null;
  const firstPageHref = buildPathWithOverrides(
    `/promo-codes/${resolvedParams.id}`,
    resolvedSearchParams,
    locale,
    { cursor: undefined },
  );
  const nextPageHref = relatedOrdersResponse.nextCursor
    ? buildPathWithOverrides(
        `/promo-codes/${resolvedParams.id}`,
        resolvedSearchParams,
        locale,
        { cursor: relatedOrdersResponse.nextCursor },
      )
    : null;
  const buildScopedPromoOrdersHref = (
    overrides: Record<string, string | undefined>,
  ) =>
    buildPathWithOverrides(
      `/promo-codes/${resolvedParams.id}`,
      resolvedSearchParams,
      locale,
      {
        ...overrides,
        cursor: undefined,
      },
    );
  const relatedOrders = promoCode ? relatedOrdersResponse.items : [];
  const analytics =
    liveAnalytics ??
    buildPromoUsageAnalytics(
      resolvedParams.id,
      promoCode?.code ?? null,
      promoCode?.maxUses ?? null,
      relatedOrders,
      snapshot.orders,
      snapshot.cities,
    );

  return (
    <AppFrame
      current="promoCodes"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.promoCodeDetailPage.eyebrow}
          title={
            promoCode
              ? dictionary.promoCodeDetailPage.title(promoTitle)
              : dictionary.promoCodeDetailPage.notFoundTitle
          }
          description={
            promoCode
              ? dictionary.promoCodeDetailPage.description
              : dictionary.promoCodeDetailPage.notFoundDescription
          }
          aside={
            <Link href={backHref} className="action-button action-button--ghost">
              {dictionary.promoCodeDetailPage.backToPromoCodes}
            </Link>
          }
        >
          {promoCode ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.forms.code}
                value={promoCode.code}
                hint={dictionary.promoCodeDetailPage.summaryDescription}
                accent="gold"
              />
              <MetricCard
                label={dictionary.forms.discountType}
                value={
                  promoCode.discountType === 'percent'
                    ? dictionary.forms.percent
                    : dictionary.forms.fixed
                }
                hint={dictionary.forms.discountValue}
                accent="teal"
              />
              <MetricCard
                label={dictionary.forms.discountValue}
                value={discountValueLabel(
                  promoCode.discountType,
                  promoCode.discountValue,
                  '%',
                )}
                hint={dictionary.forms.maxUses}
                accent="ink"
              />
              <MetricCard
                label={dictionary.forms.activeState}
                value={
                  promoCode.isActive
                    ? dictionary.forms.activeBadge
                    : dictionary.forms.inactiveBadge
                }
                hint={dictionary.forms.validTo}
                accent="ember"
              />
              <MetricCard
                label={dictionary.promoCodeDetailPage.relatedOrdersLabel}
                value={String(analytics.totalOrders)}
                hint={dictionary.promoCodeDetailPage.relatedOrdersHint}
                accent="gold"
              />
              <MetricCard
                label={dictionary.promoCodeDetailPage.completedOrdersLabel}
                value={String(analytics.completedOrders)}
                hint={dictionary.promoCodeDetailPage.completedOrdersHint}
                accent="teal"
              />
            </section>
          ) : (
            <p className="empty-state">
              {dictionary.promoCodeDetailPage.notFoundDescription}
            </p>
          )}
        </SectionShell>

        {promoCode ? (
          <>
            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.summaryTitle}
              description={dictionary.promoCodeDetailPage.summaryDescription}
            >
              <article className="promo-card">
                <div className="promo-card__top">
                  <div>
                    <h3>{promoCode.code}</h3>
                    <p>
                      {(promoCode.discountType === 'percent'
                        ? dictionary.forms.percent
                        : dictionary.forms.fixed)}{' '}
                      / {promoCode.discountValue}
                    </p>
                  </div>
                  <StatusPill tone={promoCode.isActive ? 'success' : 'neutral'}>
                    {promoCode.isActive
                      ? dictionary.forms.activeBadge
                      : dictionary.forms.inactiveBadge}
                  </StatusPill>
                </div>

                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.table.id}</dt>
                    <dd>{promoCode.id}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.discountType}</dt>
                    <dd>
                      {promoCode.discountType === 'percent'
                        ? dictionary.forms.percent
                        : dictionary.forms.fixed}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.discountValue}</dt>
                    <dd>{promoCode.discountValue}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.maxUses}</dt>
                    <dd>{promoCode.maxUses ?? dictionary.forms.noLimit}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.validTo}</dt>
                    <dd>{formatDateNullable(promoCode.validTo, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.isActive}</dt>
                    <dd>
                      {promoCode.isActive
                        ? dictionary.forms.activeBadge
                        : dictionary.forms.inactiveBadge}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.createdAt}</dt>
                    <dd>{formatDate(promoCode.createdAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.updatedAt}</dt>
                    <dd>{formatDate(promoCode.updatedAt, locale)}</dd>
                  </div>
                </dl>
              </article>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.filtersTitle}
              description={dictionary.promoCodeDetailPage.filtersDescription}
            >
              <form method="GET" className="admin-form">
                <input type="hidden" name="lang" value={locale} />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.period}</span>
                    <select name="period" defaultValue={selectedPeriod}>
                      <option value="">
                        {dictionary.promoCodeDetailPage.fullHistoryLabel}
                      </option>
                      <option value="day">{dictionary.periods.day}</option>
                      <option value="week">{dictionary.periods.week}</option>
                      <option value="month">{dictionary.periods.month}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.dateFrom}</span>
                    <input
                      name="dateFrom"
                      type="date"
                      defaultValue={selectedDateFrom}
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.dateTo}</span>
                    <input
                      name="dateTo"
                      type="date"
                      defaultValue={selectedDateTo}
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.city}</span>
                    <select name="cityId" defaultValue={selectedCityId}>
                      <option value="">{dictionary.forms.allStates}</option>
                      {snapshot.cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {locale === 'kk' ? city.nameKk : city.nameRu}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.status}</span>
                    <select name="status" defaultValue={selectedStatus}>
                      <option value="">{dictionary.forms.allStates}</option>
                      {Object.entries(dictionary.enums.orderStatus).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.serviceType}</span>
                    <select name="serviceType" defaultValue={selectedServiceType}>
                      <option value="">{dictionary.forms.allStates}</option>
                      {Object.entries(dictionary.enums.serviceType).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.payment}</span>
                    <select
                      name="paymentMethod"
                      defaultValue={selectedPaymentMethod}
                    >
                      <option value="">{dictionary.forms.allStates}</option>
                      {Object.entries(dictionary.enums.paymentMethod).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.limit}</span>
                    <input
                      name="limit"
                      type="number"
                      min="1"
                      max="50"
                      defaultValue={String(selectedLimit)}
                    />
                  </label>
                </div>
                <div className="button-row">
                  <button type="submit" className="action-button">
                    {dictionary.forms.apply}
                  </button>
                  <a
                    href={`/promo-codes/${resolvedParams.id}?lang=${locale}`}
                    className="action-button action-button--ghost"
                  >
                    {dictionary.forms.clear}
                  </a>
                </div>
              </form>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.analyticsTitle}
              description={dictionary.promoCodeDetailPage.analyticsDescription}
              aside={
                <div className="status-stack">
                  <StatusPill tone="success">{analyticsScopeLabel}</StatusPill>
                  {selectedCity ? (
                    <StatusPill tone="neutral">
                      {locale === 'kk' ? selectedCity.nameKk : selectedCity.nameRu}
                    </StatusPill>
                  ) : null}
                  {selectedDateFrom ? (
                    <StatusPill tone="neutral">
                      {dictionary.forms.dateFrom}: {formatDate(scopedDateFrom!, locale)}
                    </StatusPill>
                  ) : null}
                  {selectedDateTo ? (
                    <StatusPill tone="neutral">
                      {dictionary.forms.dateTo}: {formatDate(scopedDateTo!, locale)}
                    </StatusPill>
                  ) : null}
                  {selectedStatusLabel ? (
                    <StatusPill tone="neutral">{selectedStatusLabel}</StatusPill>
                  ) : null}
                  {selectedServiceTypeLabel ? (
                    <StatusPill tone="neutral">{selectedServiceTypeLabel}</StatusPill>
                  ) : null}
                  {selectedPaymentMethodLabel ? (
                    <StatusPill tone="neutral">
                      {selectedPaymentMethodLabel}
                    </StatusPill>
                  ) : null}
                </div>
              }
            >
              <section className="metrics-grid">
                <MetricCard
                  label={dictionary.promoCodeDetailPage.grossValueLabel}
                  value={formatMoneyTotalsByCurrency(
                    analytics.grossTotalsByCurrency,
                    locale,
                  )}
                  hint={dictionary.promoCodeDetailPage.grossValueHint}
                  accent="gold"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.discountTotalLabel}
                  value={formatMoneyTotalsByCurrency(
                    analytics.discountTotalsByCurrency,
                    locale,
                  )}
                  hint={dictionary.promoCodeDetailPage.discountTotalHint}
                  accent="ember"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.completionRateLabel}
                  value={`${formatNumber(analytics.completionRate, locale, 0)}%`}
                  hint={dictionary.promoCodeDetailPage.completionRateHint}
                  accent="teal"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.lastRedeemedLabel}
                  value={
                    analytics.lastRedeemedAt
                      ? formatDate(analytics.lastRedeemedAt, locale)
                      : '—'
                  }
                  hint={dictionary.promoCodeDetailPage.lastRedeemedHint}
                  accent="ink"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.taxiOrdersLabel}
                  value={String(analytics.taxiOrders)}
                  hint={dictionary.promoCodeDetailPage.taxiOrdersHint}
                  accent="gold"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.deliveryOrdersLabel}
                  value={String(analytics.deliveryOrders)}
                  hint={dictionary.promoCodeDetailPage.deliveryOrdersHint}
                  accent="teal"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.firstTimeUsageLabel}
                  value={String(analytics.firstTimeRedemptions)}
                  hint={dictionary.promoCodeDetailPage.firstTimeUsageHint}
                  accent="ink"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.repeatUsageLabel}
                  value={String(analytics.repeatRedemptions)}
                  hint={dictionary.promoCodeDetailPage.repeatUsageHint}
                  accent="ember"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.uniqueClientsLabel}
                  value={String(analytics.uniqueClients)}
                  hint={dictionary.promoCodeDetailPage.uniqueClientsHint}
                  accent="gold"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.usageRateLabel}
                  value={
                    analytics.usageRate === null
                      ? dictionary.forms.noLimit
                      : `${formatNumber(analytics.usageRate, locale, 0)}%`
                  }
                  hint={dictionary.promoCodeDetailPage.usageRateHint}
                  accent="teal"
                />
                <MetricCard
                  label={dictionary.promoCodeDetailPage.firstOrderConversionLabel}
                  value={`${formatNumber(
                    analytics.firstOrderConversion,
                    locale,
                    0,
                  )}%`}
                  hint={dictionary.promoCodeDetailPage.firstOrderConversionHint}
                  accent="ink"
                />
              </section>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.editTitle}
              description={dictionary.promoCodeDetailPage.editDescription}
            >
              <form action={updatePromoCodeAction} className="admin-form">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={`/promo-codes/${promoCode.id}?lang=${locale}`}
                />
                <input type="hidden" name="promoCodeId" value={promoCode.id} />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.code}</span>
                    <input name="code" defaultValue={promoCode.code} required />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.discountType}</span>
                    <select
                      name="discountType"
                      defaultValue={promoCode.discountType}
                    >
                      <option value="fixed">{dictionary.forms.fixed}</option>
                      <option value="percent">{dictionary.forms.percent}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.discountValue}</span>
                    <input
                      name="discountValue"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={promoCode.discountValue}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.maxUses}</span>
                    <input
                      name="maxUses"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={promoCode.maxUses ?? ''}
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.validTo}</span>
                    <input
                      name="validTo"
                      type="datetime-local"
                      defaultValue={toDateTimeLocalValue(promoCode.validTo)}
                    />
                  </label>
                  <label className="field field--checkbox">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked={promoCode.isActive}
                    />
                    <span>{dictionary.forms.isActive}</span>
                  </label>
                </div>
                <div className="button-row">
                  <button type="submit" className="action-button">
                    {dictionary.forms.save}
                  </button>
                </div>
              </form>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.citySplitTitle}
              description={dictionary.promoCodeDetailPage.citySplitDescription}
            >
              {analytics.cityBreakdown.length > 0 ? (
                <div className="city-grid">
                  {analytics.cityBreakdown.map((cityEntry) => {
                    const cityShare =
                      analytics.totalOrders > 0
                        ? (cityEntry.orderCount / analytics.totalOrders) * 100
                        : 0;
                    const cityTitle =
                      locale === 'kk'
                        ? cityEntry.cityNameKk || cityEntry.cityNameRu || cityEntry.cityId
                        : cityEntry.cityNameRu || cityEntry.cityNameKk || cityEntry.cityId;

                    return (
                      <article key={cityEntry.cityId} className="city-card">
                        <div className="city-card__top">
                          <h3>
                            <Link
                              href={`/cities/${cityEntry.cityId}?lang=${locale}`}
                              className="table-link"
                            >
                              {cityTitle}
                            </Link>
                          </h3>
                          <StatusPill tone="neutral">
                            {String(cityEntry.orderCount)}
                          </StatusPill>
                        </div>
                        <p>
                          {dictionary.promoCodeDetailPage.cityShareHint(
                            `${formatNumber(cityShare, locale, 0)}%`,
                          )}
                        </p>
                        <dl>
                          <div>
                            <dt>{dictionary.promoCodeDetailPage.cityOrdersLabel}</dt>
                            <dd>{String(cityEntry.orderCount)}</dd>
                          </div>
                          <div>
                            <dt>{dictionary.promoCodeDetailPage.cityGrossLabel}</dt>
                            <dd>
                              {formatMoneyTotalsByCurrency(
                                cityEntry.grossTotalsByCurrency,
                                locale,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{dictionary.promoCodeDetailPage.cityDiscountLabel}</dt>
                            <dd>
                              {formatMoneyTotalsByCurrency(
                                cityEntry.discountTotalsByCurrency,
                                locale,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{dictionary.promoCodeDetailPage.cityCompletedLabel}</dt>
                            <dd>{String(cityEntry.completedOrders)}</dd>
                          </div>
                        </dl>
                        <div className="button-row">
                          <Link
                            href={buildScopedPromoOrdersHref({
                              cityId: cityEntry.cityId,
                            })}
                            className="action-button action-button--ghost"
                          >
                            {dictionary.promoCodeDetailPage.openScopedOrdersLabel}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">
                  {dictionary.promoCodeDetailPage.emptyCitySplit}
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.paymentMixTitle}
              description={dictionary.promoCodeDetailPage.paymentMixDescription}
            >
              {analytics.paymentMethodBreakdown.length > 0 ? (
                <section className="metrics-grid">
                  {analytics.paymentMethodBreakdown.map((entry, index) => (
                    <MetricCard
                      key={entry.paymentMethod}
                      label={translatePaymentMethod(entry.paymentMethod, dictionary)}
                      value={String(entry.orderCount)}
                      hint={`${dictionary.promoCodeDetailPage.grossValueLabel}: ${formatMoneyTotalsByCurrency(
                        entry.grossTotalsByCurrency,
                        locale,
                      )} · ${dictionary.promoCodeDetailPage.discountTotalLabel}: ${formatMoneyTotalsByCurrency(
                        entry.discountTotalsByCurrency,
                        locale,
                      )}`}
                      accent={getMetricAccent(index)}
                      href={buildScopedPromoOrdersHref({
                        paymentMethod: entry.paymentMethod,
                      })}
                      actionLabel={
                        dictionary.promoCodeDetailPage.openScopedOrdersLabel
                      }
                    />
                  ))}
                </section>
              ) : (
                <p className="empty-state">
                  {dictionary.promoCodeDetailPage.emptyPaymentMix}
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.statusBreakdownTitle}
              description={dictionary.promoCodeDetailPage.statusBreakdownDescription}
            >
              {analytics.statusBreakdown.length > 0 ? (
                <section className="metrics-grid">
                  {analytics.statusBreakdown.map((entry, index) => (
                    <MetricCard
                      key={entry.status}
                      label={translateOrderStatus(entry.status, dictionary)}
                      value={String(entry.orderCount)}
                      hint={`${dictionary.promoCodeDetailPage.grossValueLabel}: ${formatMoneyTotalsByCurrency(
                        entry.grossTotalsByCurrency,
                        locale,
                      )} · ${dictionary.promoCodeDetailPage.discountTotalLabel}: ${formatMoneyTotalsByCurrency(
                        entry.discountTotalsByCurrency,
                        locale,
                      )}`}
                      accent={getMetricAccent(index)}
                      href={buildScopedPromoOrdersHref({
                        status: entry.status,
                      })}
                      actionLabel={
                        dictionary.promoCodeDetailPage.openScopedOrdersLabel
                      }
                    />
                  ))}
                </section>
              ) : (
                <p className="empty-state">
                  {dictionary.promoCodeDetailPage.emptyStatusBreakdown}
                </p>
              )}
            </SectionShell>

            <InternalActivityPanel
              activity={activity}
              entityType="promo_code"
              entityId={promoCode.id}
              locale={locale}
              dictionary={dictionary}
            />

            <InternalNotesPanel
              notes={notes}
              entityType="promo_code"
              entityId={promoCode.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={`/promo-codes/${promoCode.id}?lang=${locale}`}
            />

            <SectionShell
              eyebrow={dictionary.promoCodeDetailPage.eyebrow}
              title={dictionary.promoCodeDetailPage.ordersTitle}
              description={dictionary.promoCodeDetailPage.ordersDescription}
              aside={
                <div className="status-stack">
                  <StatusPill tone="success">{analyticsScopeLabel}</StatusPill>
                  <StatusPill tone="neutral">
                    {dictionary.promoCodeDetailPage.ordersPageHint(
                      relatedOrders.length,
                    )}
                  </StatusPill>
                  {selectedCity ? (
                    <StatusPill tone="neutral">
                      {locale === 'kk' ? selectedCity.nameKk : selectedCity.nameRu}
                    </StatusPill>
                  ) : null}
                  {selectedDateFrom ? (
                    <StatusPill tone="neutral">
                      {dictionary.forms.dateFrom}: {formatDate(scopedDateFrom!, locale)}
                    </StatusPill>
                  ) : null}
                  {selectedDateTo ? (
                    <StatusPill tone="neutral">
                      {dictionary.forms.dateTo}: {formatDate(scopedDateTo!, locale)}
                    </StatusPill>
                  ) : null}
                  {selectedStatusLabel ? (
                    <StatusPill tone="neutral">{selectedStatusLabel}</StatusPill>
                  ) : null}
                  {selectedServiceTypeLabel ? (
                    <StatusPill tone="neutral">{selectedServiceTypeLabel}</StatusPill>
                  ) : null}
                  {selectedPaymentMethodLabel ? (
                    <StatusPill tone="neutral">
                      {selectedPaymentMethodLabel}
                    </StatusPill>
                  ) : null}
                </div>
              }
            >
              <OrdersTable
                orders={relatedOrders}
                locale={locale}
                dictionary={dictionary}
                emptyMessage={dictionary.promoCodeDetailPage.emptyOrders}
              />
              {selectedCursor || nextPageHref ? (
                <div className="button-row">
                  {selectedCursor ? (
                    <Link href={firstPageHref} className="action-button action-button--ghost">
                      {dictionary.promoCodeDetailPage.firstPageLabel}
                    </Link>
                  ) : null}
                  {nextPageHref ? (
                    <Link href={nextPageHref} className="action-button">
                      {dictionary.promoCodeDetailPage.nextPageLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
