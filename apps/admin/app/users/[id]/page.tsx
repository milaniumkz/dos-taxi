import Link from 'next/link';

import { AppFrame } from '../../components/app-frame';
import { FlashBanner } from '../../components/flash-banner';
import { InternalActivityPanel } from '../../components/internal-activity-panel';
import { InternalNotesPanel } from '../../components/internal-notes-panel';
import { MetricCard } from '../../components/metric-card';
import { OrdersTable } from '../../components/orders-table';
import { SectionShell } from '../../components/section-shell';
import { UsersPanel } from '../../components/users-panel';
import {
  getAdminPageContext,
  translateOrderStatus,
  translatePaymentMethod,
  translateServiceType,
} from '../../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../../lib/admin-routing';
import {
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getUserDetailSnapshot,
} from '../../lib/backoffice';
import {
  deriveActorOrderSummary,
  formatMoney,
  formatDate,
  routeLabel,
  sortOrdersByDate,
} from '../../lib/backoffice-view';

type UserDetailPageProps = {
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

export default async function UserDetailPage({
  params,
  searchParams,
}: UserDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const [snapshot, user, notes, activity] = await Promise.all([
    getBackofficeSnapshot(),
    getUserDetailSnapshot(resolvedParams.id),
    getAdminNotesSnapshot({
      entityType: 'user',
      entityId: resolvedParams.id,
    }),
    getAdminActivitySnapshot({
      entityType: 'user',
      entityId: resolvedParams.id,
      limit: 6,
    }),
  ]);
  const returnPath = `/users/${resolvedParams.id}?lang=${locale}`;
  const backHref = `/users?lang=${locale}`;
  const relatedOrders = user
    ? sortOrdersByDate(
        snapshot.orders.filter((order) => order.clientId === user.id),
      )
    : [];
  const userTitle = user?.name?.trim() || user?.phone || resolvedParams.id;
  const orderSummary = deriveActorOrderSummary(relatedOrders);
  const latestOrder = orderSummary.latestOrder;

  return (
    <AppFrame
      current="users"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.userDetailPage.eyebrow}
          title={
            user
              ? dictionary.userDetailPage.title(userTitle)
              : dictionary.userDetailPage.notFoundTitle
          }
          description={
            user
              ? dictionary.userDetailPage.description
              : dictionary.userDetailPage.notFoundDescription
          }
          aside={
            <Link href={backHref} className="action-button action-button--ghost">
              {dictionary.userDetailPage.backToUsers}
            </Link>
          }
        >
          {user ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.userDetailPage.totalOrdersLabel}
                value={String(relatedOrders.length)}
                hint={dictionary.userDetailPage.ordersDescription}
                accent="gold"
              />
              <MetricCard
                label={dictionary.ordersPage.liveOrdersLabel}
                value={String(orderSummary.activeOrders)}
                hint={dictionary.ordersPage.liveOrdersHint(orderSummary.activeOrders)}
                accent="teal"
              />
              <MetricCard
                label={dictionary.usersPage.blockedLabel}
                value={
                  user.isBlocked
                    ? dictionary.forms.blockedBadge
                    : dictionary.forms.unblockedBadge
                }
                hint={dictionary.usersPage.blockedHint}
                accent="ember"
              />
              <MetricCard
                label={dictionary.forms.bonusBalance}
                value={formatMoney(
                  user.bonusBalance,
                  user.preferredCurrency,
                  locale,
                )}
                hint={user.preferredCurrency}
                accent="ink"
              />
            </section>
          ) : (
            <p className="empty-state">{dictionary.userDetailPage.notFoundDescription}</p>
          )}
        </SectionShell>

        {user ? (
          <>
            <SectionShell
              eyebrow={dictionary.userDetailPage.eyebrow}
              title={dictionary.userDetailPage.summaryTitle}
              description={dictionary.userDetailPage.summaryDescription}
            >
              <section className="metrics-grid">
                <MetricCard
                  label={dictionary.ordersPage.completedLabel}
                  value={String(orderSummary.completedOrders)}
                  hint={dictionary.ordersPage.completedHint}
                  accent="gold"
                />
                <MetricCard
                  label={dictionary.userDetailPage.cancelledLabel}
                  value={String(orderSummary.cancelledOrders)}
                  hint={dictionary.userDetailPage.cancelledHint}
                  accent="ember"
                />
                <MetricCard
                  label={dictionary.userDetailPage.taxiLabel}
                  value={String(orderSummary.taxiOrders)}
                  hint={dictionary.userDetailPage.taxiHint}
                  accent="ink"
                />
                <MetricCard
                  label={dictionary.userDetailPage.deliveryLabel}
                  value={String(orderSummary.deliveryOrders)}
                  hint={dictionary.userDetailPage.deliveryHint}
                  accent="teal"
                />
              </section>

              <article className="detail-card">
                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.userDetailPage.paymentMixLabel}</dt>
                    <dd>{paymentMixLabel(orderSummary.paymentMethodCounts, dictionary)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.userDetailPage.lastOrderLabel}</dt>
                    <dd>
                      {latestOrder
                        ? `${translateServiceType(latestOrder.serviceType, dictionary)} / ${translateOrderStatus(latestOrder.status, dictionary)} / ${formatDate(latestOrder.createdAt, locale)}`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.userDetailPage.lastRouteLabel}</dt>
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
              entityType="user"
              entityId={user.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={returnPath}
            />

            <InternalActivityPanel
              activity={activity}
              entityType="user"
              entityId={user.id}
              locale={locale}
              dictionary={dictionary}
            />

            <SectionShell
              eyebrow={dictionary.userDetailPage.eyebrow}
              title={dictionary.userDetailPage.profileTitle}
              description={dictionary.userDetailPage.profileDescription}
            >
              <UsersPanel
                users={[user]}
                locale={locale}
                dictionary={dictionary}
                returnPath={returnPath}
                showActions
                linkToDetails={false}
              />
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.userDetailPage.eyebrow}
              title={dictionary.userDetailPage.ordersTitle}
              description={dictionary.userDetailPage.ordersDescription}
            >
              <OrdersTable
                orders={relatedOrders}
                locale={locale}
                dictionary={dictionary}
                emptyMessage={dictionary.userDetailPage.emptyOrders}
              />
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
