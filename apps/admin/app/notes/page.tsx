import Link from 'next/link';

import { AppFrame } from '../components/app-frame';
import { MetricCard } from '../components/metric-card';
import { NotesFeed } from '../components/notes-feed';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import {
  type AdminNoteKind,
  type AdminNoteEntityType,
  type AdminNoteState,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
} from '../lib/backoffice';
import {
  type AdminNoteAging,
  deriveAdminNoteAging,
} from '../lib/backoffice-view';

type NotesPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    entityType?: string | string[];
    entityId?: string | string[];
    kind?: string | string[];
    isPinned?: string | string[];
    hasAssignee?: string | string[];
    authorQuery?: string | string[];
    assigneeQuery?: string | string[];
    state?: string | string[];
    aging?: string | string[];
    query?: string | string[];
    limit?: string | string[];
  }>;
};

function normalizeEntityType(
  value: string | undefined,
): AdminNoteEntityType | undefined {
  switch (value) {
    case 'order':
    case 'user':
    case 'executor':
    case 'city':
    case 'tariff':
    case 'promo_code':
      return value;
    default:
      return undefined;
  }
}

function normalizeKind(value: string | undefined): AdminNoteKind | undefined {
  return value === 'handoff' || value === 'escalation' || value === 'context'
    ? value
    : undefined;
}

function normalizePinnedState(value: string | undefined): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function normalizeHasAssignee(
  value: string | undefined,
): boolean | undefined {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
}

function normalizeState(value: string | undefined): AdminNoteState | undefined {
  return value === 'resolved' || value === 'archived' || value === 'open'
    ? value
    : undefined;
}

function normalizeAging(value: string | undefined): AdminNoteAging | undefined {
  return value === 'fresh' || value === 'stale' || value === 'critical'
    ? value
    : undefined;
}

function buildNotesHref(
  locale: string,
  filters: {
    entityType?: AdminNoteEntityType;
    entityId?: string;
    kind?: AdminNoteKind;
    state?: AdminNoteState;
    isPinned?: boolean;
    hasAssignee?: boolean;
    aging?: AdminNoteAging;
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
  if (filters.kind) {
    params.set('kind', filters.kind);
  }
  if (filters.state) {
    params.set('state', filters.state);
  }
  if (typeof filters.isPinned === 'boolean') {
    params.set('isPinned', String(filters.isPinned));
  }
  if (typeof filters.hasAssignee === 'boolean') {
    params.set('hasAssignee', String(filters.hasAssignee));
  }
  if (filters.aging) {
    params.set('aging', filters.aging);
  }
  return `/notes?${params.toString()}`;
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const selectedEntityType = normalizeEntityType(
    getSearchParam(resolvedSearchParams, 'entityType'),
  );
  const selectedEntityId = getSearchParam(resolvedSearchParams, 'entityId') ?? '';
  const selectedKind = normalizeKind(
    getSearchParam(resolvedSearchParams, 'kind'),
  );
  const selectedPinned = normalizePinnedState(
    getSearchParam(resolvedSearchParams, 'isPinned'),
  );
  const selectedHasAssignee = normalizeHasAssignee(
    getSearchParam(resolvedSearchParams, 'hasAssignee'),
  );
  const selectedAuthorQuery =
    getSearchParam(resolvedSearchParams, 'authorQuery') ?? '';
  const selectedAssigneeQuery =
    getSearchParam(resolvedSearchParams, 'assigneeQuery') ?? '';
  const selectedState = normalizeState(
    getSearchParam(resolvedSearchParams, 'state'),
  );
  const selectedAging = normalizeAging(
    getSearchParam(resolvedSearchParams, 'aging'),
  );
  const selectedQuery = getSearchParam(resolvedSearchParams, 'query') ?? '';
  const rawLimit = Number(getSearchParam(resolvedSearchParams, 'limit') ?? '24');
  const selectedLimit = Number.isFinite(rawLimit) ? rawLimit : 24;
  const now = Date.now();
  const returnParams = new URLSearchParams();
  returnParams.set('lang', locale);
  if (selectedEntityType) {
    returnParams.set('entityType', selectedEntityType);
  }
  if (selectedEntityId) {
    returnParams.set('entityId', selectedEntityId);
  }
  if (selectedKind) {
    returnParams.set('kind', selectedKind);
  }
  if (typeof selectedPinned === 'boolean') {
    returnParams.set('isPinned', String(selectedPinned));
  }
  if (typeof selectedHasAssignee === 'boolean') {
    returnParams.set('hasAssignee', String(selectedHasAssignee));
  }
  if (selectedAuthorQuery) {
    returnParams.set('authorQuery', selectedAuthorQuery);
  }
  if (selectedAssigneeQuery) {
    returnParams.set('assigneeQuery', selectedAssigneeQuery);
  }
  if (selectedState) {
    returnParams.set('state', selectedState);
  }
  if (selectedAging) {
    returnParams.set('aging', selectedAging);
  }
  if (selectedQuery) {
    returnParams.set('query', selectedQuery);
  }
  returnParams.set('limit', String(Math.max(1, Math.min(selectedLimit, 100))));
  const returnPath = `/notes?${returnParams.toString()}`;
  const scopeFilters = {
    entityType: selectedEntityType,
    entityId: selectedEntityId || undefined,
  } as const;
  const sourceLimit = selectedAging
    ? 100
    : Math.max(1, Math.min(selectedLimit, 100));
  const overviewNotes = await getAdminNotesSnapshot({
    ...scopeFilters,
    limit: 200,
  });
  const fetchedNotes = await getAdminNotesSnapshot({
    ...scopeFilters,
    kind: selectedKind,
    isPinned: selectedPinned,
    hasAssignee: selectedHasAssignee,
    authorQuery: selectedAuthorQuery || undefined,
    assigneeQuery: selectedAssigneeQuery || undefined,
    state: selectedState,
    query: selectedQuery || undefined,
    limit: sourceLimit,
  });
  const notes = (
    selectedAging
      ? fetchedNotes.filter(
          (note) => deriveAdminNoteAging(note, now) === selectedAging,
        )
      : fetchedNotes
  ).slice(0, Math.max(1, Math.min(selectedLimit, 100)));

  const orderNotes = notes.filter((note) => note.entityType === 'order').length;
  const userNotes = notes.filter((note) => note.entityType === 'user').length;
  const executorNotes = notes.filter((note) => note.entityType === 'executor').length;
  const cityNotes = notes.filter((note) => note.entityType === 'city').length;
  const tariffNotes = notes.filter((note) => note.entityType === 'tariff').length;
  const promoCodeNotes = notes.filter(
    (note) => note.entityType === 'promo_code',
  ).length;
  const openNotes = overviewNotes.filter((note) => note.state === 'open').length;
  const openHandoffs = overviewNotes.filter(
    (note) => note.state === 'open' && note.kind === 'handoff',
  ).length;
  const openEscalations = overviewNotes.filter(
    (note) => note.state === 'open' && note.kind === 'escalation',
  ).length;
  const unassignedOpenNotes = overviewNotes.filter(
    (note) => note.state === 'open' && !note.assignedToId,
  ).length;
  const pinnedOpenNotes = overviewNotes.filter(
    (note) => note.state === 'open' && note.isPinned,
  ).length;
  const staleOpenNotes = overviewNotes.filter(
    (note) =>
      note.state === 'open' && deriveAdminNoteAging(note, now) === 'stale',
  ).length;
  const criticalOpenNotes = overviewNotes.filter(
    (note) =>
      note.state === 'open' && deriveAdminNoteAging(note, now) === 'critical',
  ).length;
  const isPresetActive = (filters: {
    kind?: AdminNoteKind;
    state?: AdminNoteState;
    hasAssignee?: boolean;
    isPinned?: boolean;
    aging?: AdminNoteAging;
  }): boolean =>
    selectedKind === filters.kind &&
    selectedState === filters.state &&
    selectedHasAssignee === filters.hasAssignee &&
    selectedPinned === filters.isPinned &&
    selectedAging === filters.aging;

  return (
    <AppFrame
      current="notes"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <section className="metrics-grid">
          <MetricCard
            label={dictionary.notesPage.totalNotesLabel}
            value={String(notes.length)}
            hint={dictionary.notesPage.totalNotesHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.notesPage.orderNotesLabel}
            value={String(orderNotes)}
            hint={dictionary.notesPage.orderNotesHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.notesPage.userNotesLabel}
            value={String(userNotes)}
            hint={dictionary.notesPage.userNotesHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.notesPage.executorNotesLabel}
            value={String(executorNotes)}
            hint={dictionary.notesPage.executorNotesHint}
            accent="ember"
          />
          <MetricCard
            label={dictionary.notesPage.cityNotesLabel}
            value={String(cityNotes)}
            hint={dictionary.notesPage.cityNotesHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.notesPage.tariffNotesLabel}
            value={String(tariffNotes)}
            hint={dictionary.notesPage.tariffNotesHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.notesPage.promoCodeNotesLabel}
            value={String(promoCodeNotes)}
            hint={dictionary.notesPage.promoCodeNotesHint}
            accent="ink"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.notesPage.eyebrow}
          title={dictionary.notesPage.queueTitle}
          description={dictionary.notesPage.queueDescription}
        >
          <div className="metrics-grid">
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
              })}
              className={`metric-card metric-card--gold metric-card-link${
                isPresetActive({ state: 'open' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueOpenLabel}
              </span>
              <strong className="metric-card__value">{String(openNotes)}</strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueOpenHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                kind: 'handoff',
              })}
              className={`metric-card metric-card--teal metric-card-link${
                isPresetActive({ state: 'open', kind: 'handoff' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueHandoffLabel}
              </span>
              <strong className="metric-card__value">
                {String(openHandoffs)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueHandoffHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                kind: 'escalation',
              })}
              className={`metric-card metric-card--ember metric-card-link${
                isPresetActive({ state: 'open', kind: 'escalation' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueEscalationLabel}
              </span>
              <strong className="metric-card__value">
                {String(openEscalations)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueEscalationHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                hasAssignee: false,
              })}
              className={`metric-card metric-card--ink metric-card-link${
                isPresetActive({ state: 'open', hasAssignee: false })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueUnassignedLabel}
              </span>
              <strong className="metric-card__value">
                {String(unassignedOpenNotes)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueUnassignedHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                isPinned: true,
              })}
              className={`metric-card metric-card--gold metric-card-link${
                isPresetActive({ state: 'open', isPinned: true })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queuePinnedLabel}
              </span>
              <strong className="metric-card__value">
                {String(pinnedOpenNotes)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queuePinnedHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                aging: 'stale',
              })}
              className={`metric-card metric-card--teal metric-card-link${
                isPresetActive({ state: 'open', aging: 'stale' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueStaleLabel}
              </span>
              <strong className="metric-card__value">
                {String(staleOpenNotes)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueStaleHint}
              </span>
            </Link>
            <Link
              href={buildNotesHref(locale, {
                ...scopeFilters,
                state: 'open',
                aging: 'critical',
              })}
              className={`metric-card metric-card--ember metric-card-link${
                isPresetActive({ state: 'open', aging: 'critical' })
                  ? ' metric-card-link--active'
                  : ''
              }`}
            >
              <span className="metric-card__label">
                {dictionary.notesPage.queueCriticalLabel}
              </span>
              <strong className="metric-card__value">
                {String(criticalOpenNotes)}
              </strong>
              <span className="metric-card__hint">
                {dictionary.notesPage.queueCriticalHint}
              </span>
            </Link>
          </div>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.notesPage.eyebrow}
          title={dictionary.notesPage.filtersTitle}
          description={dictionary.notesPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.notesPage.entityTypeLabel}</span>
                <select
                  name="entityType"
                  defaultValue={selectedEntityType ?? ''}
                >
                  <option value="">{dictionary.notesPage.allEntities}</option>
                  <option value="order">{dictionary.nav.orders}</option>
                  <option value="user">{dictionary.nav.users}</option>
                  <option value="executor">{dictionary.nav.executors}</option>
                  <option value="city">{dictionary.nav.cities}</option>
                  <option value="tariff">{dictionary.nav.tariffs}</option>
                  <option value="promo_code">{dictionary.nav.promoCodes}</option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.entityIdLabel}</span>
                <input
                  name="entityId"
                  defaultValue={selectedEntityId}
                  placeholder={dictionary.notesPage.entityIdLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.notesPage.authorLabel}</span>
                <input
                  name="authorQuery"
                  defaultValue={selectedAuthorQuery}
                  placeholder={dictionary.notesPage.authorLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.notesPage.assigneeLabel}</span>
                <input
                  name="assigneeQuery"
                  defaultValue={selectedAssigneeQuery}
                  placeholder={dictionary.notesPage.assigneeLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.notesPage.assignmentLabel}</span>
                <select
                  name="hasAssignee"
                  defaultValue={
                    typeof selectedHasAssignee === 'boolean'
                      ? String(selectedHasAssignee)
                      : ''
                  }
                >
                  <option value="">{dictionary.notesPage.allAssignments}</option>
                  <option value="true">{dictionary.notesPage.assignedOnly}</option>
                  <option value="false">
                    {dictionary.notesPage.unassignedOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.kindLabel}</span>
                <select name="kind" defaultValue={selectedKind ?? ''}>
                  <option value="">{dictionary.notesPage.allKinds}</option>
                  <option value="context">
                    {dictionary.enums.adminNoteKind.context}
                  </option>
                  <option value="handoff">
                    {dictionary.enums.adminNoteKind.handoff}
                  </option>
                  <option value="escalation">
                    {dictionary.enums.adminNoteKind.escalation}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.pinnedLabel}</span>
                <select
                  name="isPinned"
                  defaultValue={
                    typeof selectedPinned === 'boolean'
                      ? String(selectedPinned)
                      : ''
                  }
                >
                  <option value="">{dictionary.notesPage.allPins}</option>
                  <option value="true">{dictionary.notesPage.pinnedOnly}</option>
                  <option value="false">
                    {dictionary.notesPage.unpinnedOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.stateLabel}</span>
                <select name="state" defaultValue={selectedState ?? ''}>
                  <option value="">{dictionary.notesPage.allNoteStates}</option>
                  <option value="open">
                    {dictionary.enums.adminNoteState.open}
                  </option>
                  <option value="resolved">
                    {dictionary.enums.adminNoteState.resolved}
                  </option>
                  <option value="archived">
                    {dictionary.enums.adminNoteState.archived}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.agingLabel}</span>
                <select name="aging" defaultValue={selectedAging ?? ''}>
                  <option value="">{dictionary.notesPage.allAging}</option>
                  <option value="fresh">{dictionary.notesPage.freshOnly}</option>
                  <option value="stale">{dictionary.notesPage.staleOnly}</option>
                  <option value="critical">
                    {dictionary.notesPage.criticalOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPage.queryLabel}</span>
                <input
                  name="query"
                  defaultValue={selectedQuery}
                  placeholder={dictionary.notesPage.queryLabel}
                />
              </label>
              <label className="field">
                <span>{dictionary.notesPage.limitLabel}</span>
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
              <a href={`/notes?lang=${locale}`} className="action-button action-button--ghost">
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.notesPage.eyebrow}
          title={dictionary.notesPage.title}
          description={dictionary.notesPage.description}
          aside={
            <StatusPill tone="neutral">
              {String(notes.length)}
            </StatusPill>
          }
        >
          <NotesFeed
            notes={notes}
            locale={locale}
            dictionary={dictionary}
            emptyMessage={dictionary.notesPage.empty}
            returnPath={returnPath}
          />
        </SectionShell>
      </main>
    </AppFrame>
  );
}
