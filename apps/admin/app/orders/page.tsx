import { getCreationLabels } from "../lib/creation-i18n";
import { AppFrame } from '../components/app-frame';
import { FlashBanner } from '../components/flash-banner';
import { MetricCard } from '../components/metric-card';
import { OrdersTable } from '../components/orders-table';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import { assignOrderAction } from '../lib/admin-actions';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import { getBackofficeSnapshot } from '../lib/backoffice';
import {
  deriveSnapshotMetrics,
  sortOrdersByDate,
} from '../lib/backoffice-view';

type OrdersPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    status?: string | string[];
    cityId?: string | string[];
    limit?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const { activeOrders, searchingOrders, deliveryOrders, completedOrders } =
    deriveSnapshotMetrics(snapshot);
  const selectedStatus = getSearchParam(resolvedSearchParams, 'status') ?? '';
  const selectedCityId = getSearchParam(resolvedSearchParams, 'cityId') ?? '';
  const rawLimit = Number(getSearchParam(resolvedSearchParams, 'limit') ?? '12');
  const selectedLimit = Number.isFinite(rawLimit) ? rawLimit : 12;
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const returnPath = buildReturnPath('/orders', resolvedSearchParams, locale);

  const recentOrders = sortOrdersByDate(snapshot.orders)
    .filter((order) => {
      if (selectedStatus && order.status !== selectedStatus) {
        return false;
      }
      if (selectedCityId && order.cityId !== selectedCityId) {
        return false;
      }
      return true;
    })
    .slice(0, Math.max(1, Math.min(selectedLimit, 50)));

  const recentCompletedOrders = sortOrdersByDate(completedOrders).slice(0, 8);

  return (
    <AppFrame
      current="orders"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
          <a className="action-button" href={`/orders/new?lang=${locale}&cityId=${selectedCityId}`}>{getCreationLabels(locale).newOrder}</a>
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.ordersPage.liveOrdersLabel}
            value={String(activeOrders.length)}
            hint={dictionary.ordersPage.liveOrdersHint(searchingOrders.length)}
            accent="gold"
          />
          <MetricCard
            label={dictionary.ordersPage.deliveryFlowLabel}
            value={String(deliveryOrders.length)}
            hint={dictionary.ordersPage.deliveryFlowHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.ordersPage.completedLabel}
            value={String(completedOrders.length)}
            hint={dictionary.ordersPage.completedHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.ordersPage.totalFeedLabel}
            value={String(snapshot.orders.length)}
            hint={dictionary.ordersPage.totalFeedHint}
            accent="ember"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.ordersPage.liveEyebrow}
          title={dictionary.ordersPage.filtersTitle}
          description={dictionary.ordersPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.status}</span>
                <select name="status" defaultValue={selectedStatus}>
                  <option value="">{dictionary.forms.allStates}</option>
                  {Object.entries(dictionary.enums.orderStatus).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.city}</span>
                <select name="cityId" defaultValue={selectedCityId}>
                  <option value="">{dictionary.forms.allStates}</option>
                  {snapshot.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.nameRu}
                    </option>
                  ))}
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
              <a href={`/orders?lang=${locale}`} className="action-button action-button--ghost">
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.ordersPage.liveEyebrow}
          title={dictionary.ordersPage.liveTitle}
          description={dictionary.ordersPage.liveDescription}
          aside={
            <StatusPill tone="warning">
              {dictionary.ordersPage.liveAside(recentOrders.length)}
            </StatusPill>
          }
        >
          <OrdersTable
            orders={recentOrders}
            locale={locale}
            dictionary={dictionary}
            emptyMessage={dictionary.ordersPage.emptyActiveOrders}
          />
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.ordersPage.liveEyebrow}
          title={dictionary.ordersPage.assignTitle}
          description={dictionary.ordersPage.assignDescription}
        >
          <form action={assignOrderAction} className="admin-form admin-form--inline">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.orderId}</span>
                <input name="orderId" required />
              </label>
              <label className="field">
                <span>{dictionary.forms.executorId}</span>
                <input name="executorId" required />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.assign}
              </button>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.ordersPage.historyEyebrow}
          title={dictionary.ordersPage.historyTitle}
          description={dictionary.ordersPage.historyDescription}
          aside={
            <StatusPill tone="success">
              {dictionary.ordersPage.historyAside(recentCompletedOrders.length)}
            </StatusPill>
          }
        >
          <OrdersTable
            orders={recentCompletedOrders}
            locale={locale}
            dictionary={dictionary}
            emptyMessage={dictionary.ordersPage.emptyCompletedOrders}
          />
        </SectionShell>
      </main>
    </AppFrame>
  );
}
