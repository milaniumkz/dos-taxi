import Link from 'next/link';

import { AppFrame } from '../components/app-frame';
import { ActivityFeed } from '../components/activity-feed';
import { MetricCard } from '../components/metric-card';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import {
  type AdminActivityAction,
  type AdminActivityEntityType,
  type AdminActivityGroup,
  type AdminActivityWindow,
  getAdminActivitySnapshot,
  getBackofficeSnapshot,
} from '../lib/backoffice';

type ActivityPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    entityType?: string | string[];
    entityId?: string | string[];
    action?: string | string[];
    group?: string | string[];
    window?: string | string[];
    actorId?: string | string[];
    actorQuery?: string | string[];
    query?: string | string[];
    limit?: string | string[];
  }>;
};

const ACTIVITY_ENTITY_OPTIONS: AdminActivityEntityType[] = [
  'order',
  'user',
  'executor',
  'city',
  'tariff',
  'promo_code',
  'payment',
];

const ACTIVITY_ACTION_OPTIONS: AdminActivityAction[] = [
  'city.created',
  'city.updated',
  'tariff.created',
  'tariff.updated',
  'order.assigned',
  'order.status_updated',
  'order.dispatch_retried',
  'note.created',
  'note.updated',
  'user.updated',
  'executor.updated',
  'executor.verified',
  'executor.blocked',
  'promo_code.created',
  'promo_code.updated',
  'payment.refunded',
  'payment.cancelled',
];

function normalizeEntityType(
  value: string | undefined,
): AdminActivityEntityType | undefined {
  return ACTIVITY_ENTITY_OPTIONS.includes(value as AdminActivityEntityType)
    ? (value as AdminActivityEntityType)
    : undefined;
}

function normalizeAction(
  value: string | undefined,
): AdminActivityAction | undefined {
  return ACTIVITY_ACTION_OPTIONS.includes(value as AdminActivityAction)
    ? (value as AdminActivityAction)
    : undefined;
}

function normalizeGroup(
  value: string | undefined,
): AdminActivityGroup | undefined {
  return value === 'order' ||
    value === 'payment' ||
    value === 'note' ||
    value === 'moderation'
    ? value
    : undefined;
}

function normalizeWindow(
  value: string | undefined,
): AdminActivityWindow | undefined {
  return value === 'hour' || value === 'day' || value === 'week'
    ? value
    : undefined;
}

function matchesActivityGroup(
  action: AdminActivityAction,
  group: AdminActivityGroup,
): boolean {
  switch (group) {
    case 'order':
      return action.startsWith('order.');
    case 'payment':
      return action.startsWith('payment.');
    case 'note':
      return action.startsWith('note.');
    case 'moderation':
      return (
        action.startsWith('user.') ||
        action.startsWith('executor.') ||
        action.startsWith('city.') ||
        action.startsWith('tariff.') ||
        action.startsWith('promo_code.')
      );
    default:
      return false;
  }
}

function matchesActivityWindow(
  createdAt: string,
  window: AdminActivityWindow,
  now: number,
): boolean {
  const ageMs = Math.max(0, now - new Date(createdAt).getTime());
  switch (window) {
    case 'hour':
      return ageMs <= 60 * 60 * 1000;
    case 'day':
      return ageMs <= 24 * 60 * 60 * 1000;
    case 'week':
      return ageMs <= 7 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

function buildActivityHref(
  locale: string,
  filters: {
    entityType?: AdminActivityEntityType;
    entityId?: string;
    group?: AdminActivityGroup;
    window?: AdminActivityWindow;
    actorId?: string;
    actorQuery?: string;
  },
): string {
  const params = new URLSearchParams();
  params.set('lang', locale);
  if (filters.entityType) {
    params.set('entityType', filters.entityType);
  }
  if (filters.entityId) {
    params.set('entityId', filters.entityId);
  }
  if (filters.group) {
    params.set('group', filters.group);
  }
  if (filters.window) {
    params.set('window', filters.window);
  }
  if (filters.actorId) {
    params.set('actorId', filters.actorId);
  }
  if (filters.actorQuery) {
    params.set('actorQuery', filters.actorQuery);
  }
  return `/activity?${params.toString()}`;
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const now = Date.now();
  const selectedEntityType = normalizeEntityType(
    getSearchParam(resolvedSearchParams, 'entityType'),
  );
  const selectedEntityId = getSearchParam(resolvedSearchParams, 'entityId') ?? '';
  const selectedAction = normalizeAction(
    getSearchParam(resolvedSearchParams, 'action'),
  );
  const selectedGroup = normalizeGroup(
    getSearchParam(resolvedSearchParams, 'group'),
  );
  const selectedWindow = normalizeWindow(
    getSearchParam(resolvedSearchParams, 'window'),
  );
  const selectedActorId = getSearchParam(resolvedSearchParams, 'actorId') ?? '';
  const selectedActorQuery =
    getSearchParam(resolvedSearchParams, 'actorQuery') ?? '';
  const selectedQuery = getSearchParam(resolvedSearchParams, 'query') ?? '';
  const rawLimit = Number(getSearchParam(resolvedSearchParams, 'limit') ?? '24');
  const selectedLimit = Number.isFinite(rawLimit) ? rawLimit : 24;

  const [overviewActivity, fetchedActivity] = await Promise.all([
    getAdminActivitySnapshot({
      entityType: selectedEntityType,
      entityId: selectedEntityId || undefined,
      actorId: selectedActorId || undefined,
      actorQuery: selectedActorQuery || undefined,
      limit: 200,
    }),
    getAdminActivitySnapshot({
      entityType: selectedEntityType,
      entityId: selectedEntityId || undefined,
      action: selectedAction,
      group: selectedGroup,
      window: selectedWindow,
      actorId: selectedActorId || undefined,
      actorQuery: selectedActorQuery || undefined,
      query: selectedQuery || undefined,
      limit: Math.max(1, Math.min(selectedLimit, 100)),
    }),
  ]);

  const activity = fetchedActivity;

  const orderOps = activity.filter((entry) => entry.action.startsWith('order.')).length;
  const noteOps = activity.filter((entry) => entry.action.startsWith('note.')).length;
  const paymentOps = activity.filter((entry) => entry.action.startsWith('payment.')).length;
  const moderationOps = activity.filter(
    (entry) =>
      entry.action.startsWith('user.') ||
      entry.action.startsWith('executor.') ||
      entry.action.startsWith('city.') ||
      entry.action.startsWith('tariff.') ||
      entry.action.startsWith('promo_code.'),
  ).length;

  const queueOrderOps = overviewActivity.filter((entry) =>
    matchesActivityGroup(entry.action, 'order'),
  ).length;
  const queuePaymentOps = overviewActivity.filter((entry) =>
    matchesActivityGroup(entry.action, 'payment'),
  ).length;
  const queueNoteOps = overviewActivity.filter((entry) =>
    matchesActivityGroup(entry.action, 'note'),
  ).length;
  const queueModerationOps = overviewActivity.filter((entry) =>
    matchesActivityGroup(entry.action, 'moderation'),
  ).length;
  const queueHourOps = overviewActivity.filter((entry) =>
    matchesActivityWindow(entry.createdAt, 'hour', now),
  ).length;
  const queueDayOps = overviewActivity.filter((entry) =>
    matchesActivityWindow(entry.createdAt, 'day', now),
  ).length;
  const queueWeekOps = overviewActivity.filter((entry) =>
    matchesActivityWindow(entry.createdAt, 'week', now),
  ).length;
  const scopeFilters = {
    entityType: selectedEntityType,
    entityId: selectedEntityId || undefined,
    actorId: selectedActorId || undefined,
    actorQuery: selectedActorQuery || undefined,
  } as const;
  const isPresetActive = (filters: {
    group?: AdminActivityGroup;
    window?: AdminActivityWindow;
  }): boolean =>
    selectedGroup === filters.group && selectedWindow === filters.window;

  return (
    <AppFrame
      current="activity"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <section className="metrics-grid">
          <MetricCard
            label={dictionary.activityPage.totalEventsLabel}
            value={String(activity.length)}
            hint={dictionary.activityPage.totalEventsHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.activityPage.orderOpsLabel}
            value={String(orderOps)}
            hint={dictionary.activityPage.orderOpsHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.activityPage.noteOpsLabel}
            value={String(noteOps)}
            hint={dictionary.activityPage.noteOpsHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.activityPage.paymentOpsLabel}
            value={String(paymentOps)}
            hint={dictionary.activityPage.paymentOpsHint}
            accent="ember"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.activityPage.eyebrow}
          title={dictionary.activityPage.title}
          description={dictionary.activityPage.description}
          aside={
            <StatusPill tone="neutral">
              {dictionary.activityPage.moderationOpsLabel}: {String(moderationOps)}
            </StatusPill>
          }
        >
          <div className="metrics-grid">
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                group: 'order',
              })}
              className={`metric-card metric-card--gold metric-card-link${
                isPresetActive({ group: 'order' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.groupOrderLabel}
              </span>
              <strong className="metric-card__value">{String(queueOrderOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.groupOrderHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                group: 'payment',
              })}
              className={`metric-card metric-card--teal metric-card-link${
                isPresetActive({ group: 'payment' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.groupPaymentLabel}
              </span>
              <strong className="metric-card__value">{String(queuePaymentOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.groupPaymentHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                group: 'note',
              })}
              className={`metric-card metric-card--ink metric-card-link${
                isPresetActive({ group: 'note' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.groupNoteLabel}
              </span>
              <strong className="metric-card__value">{String(queueNoteOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.groupNoteHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                group: 'moderation',
              })}
              className={`metric-card metric-card--ember metric-card-link${
                isPresetActive({ group: 'moderation' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.groupModerationLabel}
              </span>
              <strong className="metric-card__value">
                {String(queueModerationOps)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.groupModerationHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                window: 'hour',
              })}
              className={`metric-card metric-card--gold metric-card-link${
                isPresetActive({ window: 'hour' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.windowHourLabel}
              </span>
              <strong className="metric-card__value">{String(queueHourOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.windowHourHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                window: 'day',
              })}
              className={`metric-card metric-card--teal metric-card-link${
                isPresetActive({ window: 'day' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.windowDayLabel}
              </span>
              <strong className="metric-card__value">{String(queueDayOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.windowDayHint}
              </span>
            </Link>
            <Link
              href={buildActivityHref(locale, {
                ...scopeFilters,
                window: 'week',
              })}
              className={`metric-card metric-card--ink metric-card-link${
                isPresetActive({ window: 'week' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.activityPage.windowWeekLabel}
              </span>
              <strong className="metric-card__value">{String(queueWeekOps)}</strong>
              <span className="metric-card__hint">
                {dictionary.activityPage.windowWeekHint}
              </span>
            </Link>
          </div>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.activityPage.eyebrow}
          title={dictionary.activityPage.filtersTitle}
          description={dictionary.activityPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.activityPage.entityTypeLabel}</span>
                <select name="entityType" defaultValue={selectedEntityType ?? ''}>
                  <option value="">{dictionary.activityPage.allEntities}</option>
                  {ACTIVITY_ENTITY_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {dictionary.enums.adminActivityEntityType[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{dictionary.activityPage.entityIdLabel}</span>
                <input
                  name="entityId"
                  defaultValue={selectedEntityId}
                  placeholder={dictionary.activityPage.entityIdLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.forms.actorId}</span>
                <input
                  name="actorId"
                  defaultValue={selectedActorId}
                  placeholder={dictionary.forms.actorId}
                />
              </label>
              <label className="field">
                <span>{dictionary.activityPage.actorLabel}</span>
                <input
                  name="actorQuery"
                  defaultValue={selectedActorQuery}
                  placeholder={dictionary.activityPage.actorLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.activityPage.actionLabel}</span>
                <select name="action" defaultValue={selectedAction ?? ''}>
                  <option value="">{dictionary.activityPage.allActions}</option>
                  {ACTIVITY_ACTION_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {dictionary.enums.adminActivityAction[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{dictionary.activityPage.groupLabel}</span>
                <select name="group" defaultValue={selectedGroup ?? ''}>
                  <option value="">{dictionary.activityPage.allGroups}</option>
                  <option value="order">
                    {dictionary.activityPage.groupOrderLabel}
                  </option>
                  <option value="payment">
                    {dictionary.activityPage.groupPaymentLabel}
                  </option>
                  <option value="note">
                    {dictionary.activityPage.groupNoteLabel}
                  </option>
                  <option value="moderation">
                    {dictionary.activityPage.groupModerationLabel}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.activityPage.windowLabel}</span>
                <select name="window" defaultValue={selectedWindow ?? ''}>
                  <option value="">{dictionary.activityPage.allWindows}</option>
                  <option value="hour">
                    {dictionary.activityPage.windowHourLabel}
                  </option>
                  <option value="day">
                    {dictionary.activityPage.windowDayLabel}
                  </option>
                  <option value="week">
                    {dictionary.activityPage.windowWeekLabel}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.activityPage.queryLabel}</span>
                <input
                  name="query"
                  defaultValue={selectedQuery}
                  placeholder={dictionary.activityPage.queryLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.activityPage.limitLabel}</span>
                <input
                  name="limit"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={String(Math.max(1, Math.min(selectedLimit, 100)))}
                />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a
                href={`/activity?lang=${locale}`}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.activityPage.eyebrow}
          title={dictionary.activityPage.title}
          description={dictionary.activityPage.description}
          aside={<StatusPill tone="neutral">{String(activity.length)}</StatusPill>}
        >
          <ActivityFeed
            activity={activity}
            locale={locale}
            dictionary={dictionary}
            emptyMessage={dictionary.activityPage.empty}
          />
        </SectionShell>
      </main>
    </AppFrame>
  );
}
