import {
  AdminNoteSnapshot,
  AdminOrderSnapshot,
  BackofficeSnapshot,
  CitySnapshot,
  PaymentMethod,
  TariffSnapshot,
} from './backoffice';
import {
  AdminLocale,
  getIntlLocale,
} from './admin-i18n';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'brand';

export type AdminNoteAging = 'fresh' | 'stale' | 'critical';

const NOTE_STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const NOTE_CRITICAL_AFTER_MS = 12 * 60 * 60 * 1000;

export function formatMoney(
  value: number | string,
  currency: string,
  locale: AdminLocale,
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatMoneyTotalsByCurrency(
  totals: Partial<Record<string, number>>,
  locale: AdminLocale,
): string {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return '—';
  }

  return entries
    .sort(([leftCurrency], [rightCurrency]) =>
      leftCurrency.localeCompare(rightCurrency),
    )
    .map(([currency, amount]) => formatMoney(amount ?? 0, currency, locale))
    .join(' / ');
}

export function formatNumber(
  value: number | string,
  locale: AdminLocale,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits,
  }).format(Number(value));
}

export function formatDate(value: string, locale: AdminLocale): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDateNullable(
  value: string | null | undefined,
  locale: AdminLocale,
): string {
  return value ? formatDate(value, locale) : '—';
}

export function formatDistance(
  value: number | null | undefined,
  locale: AdminLocale,
): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (value < 1000) {
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'unit',
      unit: 'meter',
      unitDisplay: 'narrow',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'narrow',
    maximumFractionDigits: 1,
  }).format(value / 1000);
}

export function formatDuration(
  value: number | null | undefined,
  locale: AdminLocale,
): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(Math.round(value / 60));
}

export function orderTone(status: string): StatusTone {
  if (status === 'completed' || status === 'delivered') {
    return 'success';
  }
  if (status === 'searching' || status === 'waiting') {
    return 'warning';
  }
  if (status.startsWith('cancelled') || status === 'failed') {
    return 'danger';
  }
  if (status === 'accepted' || status === 'arriving' || status === 'in_progress') {
    return 'brand';
  }
  return 'neutral';
}

export function routeLabel(order: AdminOrderSnapshot): string {
  return [order.pickupAddress, order.destinationAddress]
    .filter(Boolean)
    .join(' -> ');
}

export function deriveAdminNoteAging(
  note: Pick<AdminNoteSnapshot, 'createdAt' | 'updatedAt'>,
  now = Date.now(),
): AdminNoteAging {
  const referenceDate = note.updatedAt || note.createdAt;
  const ageMs = Math.max(0, now - new Date(referenceDate).getTime());

  if (ageMs >= NOTE_CRITICAL_AFTER_MS) {
    return 'critical';
  }
  if (ageMs >= NOTE_STALE_AFTER_MS) {
    return 'stale';
  }
  return 'fresh';
}

export function cityPrimaryName(
  city: Pick<CitySnapshot, 'nameRu' | 'nameKk'>,
  locale: AdminLocale,
): string {
  return locale === 'kk' ? city.nameKk : city.nameRu;
}

export function citySecondaryName(
  city: Pick<CitySnapshot, 'nameRu' | 'nameKk'>,
  locale: AdminLocale,
): string {
  return locale === 'kk' ? city.nameRu : city.nameKk;
}

export function tariffPrimaryName(
  tariff: TariffSnapshot,
  locale: AdminLocale,
): string {
  return locale === 'kk' ? tariff.nameKk : tariff.nameRu;
}

export function sortOrdersByDate(
  orders: AdminOrderSnapshot[],
): AdminOrderSnapshot[] {
  return [...orders].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export type ActorOrderSummary = {
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  taxiOrders: number;
  deliveryOrders: number;
  paymentMethodCounts: Partial<Record<PaymentMethod, number>>;
  latestOrder: AdminOrderSnapshot | null;
};

export function deriveActorOrderSummary(
  orders: AdminOrderSnapshot[],
): ActorOrderSummary {
  const paymentMethodCounts: Partial<Record<PaymentMethod, number>> = {};

  for (const order of orders) {
    paymentMethodCounts[order.paymentMethod] =
      (paymentMethodCounts[order.paymentMethod] ?? 0) + 1;
  }

  return {
    activeOrders: orders.filter((order) =>
      ['searching', 'accepted', 'arriving', 'waiting', 'in_progress'].includes(
        order.status,
      ),
    ).length,
    completedOrders: orders.filter((order) =>
      ['completed', 'delivered'].includes(order.status),
    ).length,
    cancelledOrders: orders.filter(
      (order) =>
        order.status.startsWith('cancelled') || order.status === 'failed',
    ).length,
    taxiOrders: orders.filter((order) => order.serviceType === 'taxi').length,
    deliveryOrders: orders.filter((order) => order.serviceType === 'delivery').length,
    paymentMethodCounts,
    latestOrder: orders[0] ?? null,
  };
}

export function deriveSnapshotMetrics(snapshot: BackofficeSnapshot) {
  const activeOrders = snapshot.orders.filter((order) =>
    ['searching', 'accepted', 'arriving', 'waiting', 'in_progress'].includes(
      order.status,
    ),
  );
  const searchingOrders = snapshot.orders.filter(
    (order) => order.status === 'searching',
  );
  const deliveryOrders = snapshot.orders.filter(
    (order) => order.serviceType === 'delivery',
  );
  const completedOrders = snapshot.orders.filter(
    (order) => order.status === 'completed',
  );
  const activeCities = snapshot.cities.filter((city) => city.isActive);
  const capturedKzt = snapshot.financial.capturedAmountByCurrency.KZT ?? 0;
  const refundedKzt = snapshot.financial.refundedAmountByCurrency.KZT ?? 0;

  return {
    activeOrders,
    searchingOrders,
    deliveryOrders,
    completedOrders,
    activeCities,
    capturedKzt,
    refundedKzt,
  };
}
