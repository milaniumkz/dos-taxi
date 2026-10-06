import Link from 'next/link';

import { AppFrame } from '../../components/app-frame';
import { ExecutorsPanel } from '../../components/executors-panel';
import { FlashBanner } from '../../components/flash-banner';
import { InternalActivityPanel } from '../../components/internal-activity-panel';
import { InternalNotesPanel } from '../../components/internal-notes-panel';
import { MetricCard } from '../../components/metric-card';
import { OrdersTable } from '../../components/orders-table';
import { SectionShell } from '../../components/section-shell';
import {
  getAdminPageContext,
  translateOrderStatus,
  translatePaymentMethod,
  translateServiceType,
  translateVerificationStatus,
} from '../../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../../lib/admin-routing';
import {
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getExecutorDetailSnapshot,
} from '../../lib/backoffice';
import {
  deriveActorOrderSummary,
  formatDate,
  formatNumber,
  routeLabel,
  sortOrdersByDate,
} from '../../lib/backoffice-view';

type ExecutorDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

function paymentMixLabel(
  counts: ReturnType<typeof deriveActorOrderSummary>['paymentMethodCounts'],
  dictionary: Awaited<ReturnType<typeof getAdminPageContext>>['dictionary'],
) {
  const labels = (['card', 'cash', 'corporate', 'bonus'] as const)
    .filter((method) => (counts[method] ?? 0) > 0)
    .map(
      (method) =>
        `${translatePaymentMethod(method, dictionary)}: ${counts[method] ?? 0}`,
    );

  return labels.join(' / ') || '0';
}

export default async function ExecutorDetailPage({
  params,
  searchParams,
}: ExecutorDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const [snapshot, executor, notes, activity] = await Promise.all([
    getBackofficeSnapshot(),
    getExecutorDetailSnapshot(resolvedParams.id),
    getAdminNotesSnapshot({
      entityType: 'executor',
      entityId: resolvedParams.id,
    }),
    getAdminActivitySnapshot({
      entityType: 'executor',
      entityId: resolvedParams.id,
      limit: 6,
    }),
  ]);
  const returnPath = `/executors/${resolvedParams.id}?lang=${locale}`;
  const backHref = `/executors?lang=${locale}`;
  const relatedOrders = executor
    ? sortOrdersByDate(
        snapshot.orders.filter((order) => order.executorId === executor.id),
      )
    : [];
  const executorTitle =
    executor?.user?.name?.trim() || executor?.user?.phone || resolvedParams.id;
  const orderSummary = deriveActorOrderSummary(relatedOrders);
  const latestOrder = orderSummary.latestOrder;

  return (
    <AppFrame
      current="executors"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.executorDetailPage.eyebrow}
          title={
            executor
              ? dictionary.executorDetailPage.title(executorTitle)
              : dictionary.executorDetailPage.notFoundTitle
          }
          description={
            executor
              ? dictionary.executorDetailPage.description
              : dictionary.executorDetailPage.notFoundDescription
          }
          aside={
            <Link href={backHref} className="action-button action-button--ghost">
              {dictionary.executorDetailPage.backToExecutors}
            </Link>
          }
        >
          {executor ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.executorDetailPage.totalOrdersLabel}
                value={String(relatedOrders.length)}
                hint={dictionary.executorDetailPage.ordersDescription}
                accent="gold"
              />
              <MetricCard
                label={dictionary.ordersPage.liveOrdersLabel}
                value={String(orderSummary.activeOrders)}
                hint={dictionary.ordersPage.liveOrdersHint(orderSummary.activeOrders)}
                accent="teal"
              />
              <MetricCard
                label={dictionary.executorsPage.onlineLabel}
                value={
                  executor.isOnline
                    ? dictionary.forms.onlineBadge
                    : dictionary.forms.offlineBadge
                }
                hint={dictionary.executorsPage.onlineHint}
                accent="ink"
              />
              <MetricCard
                label={dictionary.executorsPage.verifiedLabel}
                value={translateVerificationStatus(
                  executor.verificationStatus,
                  dictionary,
                )}
                hint={formatNumber(executor.rating, locale, 2)}
                accent="ember"
              />
            </section>
          ) : (
            <p className="empty-state">
              {dictionary.executorDetailPage.notFoundDescription}
            </p>
          )}
        </SectionShell>

        {executor ? (
          <>
            <SectionShell
              eyebrow={dictionary.executorDetailPage.eyebrow}
              title={dictionary.executorDetailPage.summaryTitle}
              description={dictionary.executorDetailPage.summaryDescription}
            >
              <section className="metrics-grid">
                <MetricCard
                  label={dictionary.ordersPage.completedLabel}
                  value={String(orderSummary.completedOrders)}
                  hint={dictionary.ordersPage.completedHint}
                  accent="gold"
                />
                <MetricCard
                  label={dictionary.executorDetailPage.cancelledLabel}
                  value={String(orderSummary.cancelledOrders)}
                  hint={dictionary.executorDetailPage.cancelledHint}
                  accent="ember"
                />
                <MetricCard
                  label={dictionary.executorDetailPage.taxiLabel}
                  value={String(orderSummary.taxiOrders)}
                  hint={dictionary.executorDetailPage.taxiHint}
                  accent="ink"
                />
                <MetricCard
                  label={dictionary.executorDetailPage.deliveryLabel}
                  value={String(orderSummary.deliveryOrders)}
                  hint={dictionary.executorDetailPage.deliveryHint}
                  accent="teal"
                />
              </section>

              <article className="detail-card">
                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.executorDetailPage.paymentMixLabel}</dt>
                    <dd>{paymentMixLabel(orderSummary.paymentMethodCounts, dictionary)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.executorDetailPage.lastOrderLabel}</dt>
                    <dd>
                      {latestOrder
                        ? `${translateServiceType(latestOrder.serviceType, dictionary)} / ${translateOrderStatus(latestOrder.status, dictionary)} / ${formatDate(latestOrder.createdAt, locale)}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.executorDetailPage.lastRouteLabel}</dt>
                    <dd>
                      {latestOrder
                        ? routeLabel(latestOrder) || dictionary.table.routePending
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </article>
            </SectionShell>

            <InternalNotesPanel
              notes={notes}
              entityType="executor"
              entityId={executor.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={returnPath}
            />

            <InternalActivityPanel
              activity={activity}
              entityType="executor"
              entityId={executor.id}
              locale={locale}
              dictionary={dictionary}
            />

            <SectionShell
              eyebrow={dictionary.executorDetailPage.eyebrow}
              title={dictionary.executorDetailPage.profileTitle}
              description={dictionary.executorDetailPage.profileDescription}
            >
              <ExecutorsPanel
                executors={[executor]}
                locale={locale}
                dictionary={dictionary}
                returnPath={returnPath}
                showActions
                linkToDetails={false}
              />
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.executorDetailPage.eyebrow}
              title={dictionary.executorDetailPage.ordersTitle}
              description={dictionary.executorDetailPage.ordersDescription}
            >
              <OrdersTable
                orders={relatedOrders}
                locale={locale}
                dictionary={dictionary}
                emptyMessage={dictionary.executorDetailPage.emptyOrders}
              />
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
