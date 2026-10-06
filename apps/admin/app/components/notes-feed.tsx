import Link from 'next/link';

import {
  updateAdminNoteAction,
} from '../lib/admin-actions';
import {
  AdminDictionary,
  AdminLocale,
  buildLocalizedHref,
  localizeAdminNoteKind,
  localizeAdminNoteState,
} from '../lib/admin-i18n';
import { type AdminNoteKind, type AdminNoteSnapshot } from '../lib/backoffice';
import {
  deriveAdminNoteAging,
  formatDate,
} from '../lib/backoffice-view';
import { StatusPill } from './status-pill';

type NotesFeedProps = {
  notes: AdminNoteSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  emptyMessage?: string;
  returnPath: string;
};

function noteEntityLabel(
  note: AdminNoteSnapshot,
  dictionary: AdminDictionary,
): string {
  switch (note.entityType) {
    case 'city':
      return dictionary.nav.cities;
    case 'tariff':
      return dictionary.nav.tariffs;
    case 'promo_code':
      return dictionary.nav.promoCodes;
    case 'user':
      return dictionary.nav.users;
    case 'executor':
      return dictionary.nav.executors;
    case 'order':
    default:
      return dictionary.nav.orders;
  }
}

function noteEntityHref(
  note: AdminNoteSnapshot,
  locale: AdminLocale,
): string {
  switch (note.entityType) {
    case 'city':
      return buildLocalizedHref(`/cities/${note.entityId}`, locale);
    case 'tariff':
      return buildLocalizedHref(`/tariffs/${note.entityId}`, locale);
    case 'promo_code':
      return buildLocalizedHref(`/promo-codes/${note.entityId}`, locale);
    case 'user':
      return buildLocalizedHref(`/users/${note.entityId}`, locale);
    case 'executor':
      return buildLocalizedHref(`/executors/${note.entityId}`, locale);
    case 'order':
    default:
      return buildLocalizedHref(`/orders/${note.entityId}`, locale);
  }
}

function entityTone(
  entityType: AdminNoteSnapshot['entityType'],
): 'gold' | 'teal' | 'ink' {
  switch (entityType) {
    case 'city':
    case 'user':
      return 'ink';
    case 'tariff':
    case 'executor':
      return 'teal';
    case 'promo_code':
      return 'gold';
    case 'order':
    default:
      return 'gold';
  }
}

function entityStatusTone(
  entityType: AdminNoteSnapshot['entityType'],
): 'brand' | 'success' | 'neutral' {
  switch (entityType) {
    case 'tariff':
    case 'order':
      return 'brand';
    case 'executor':
    case 'promo_code':
      return 'success';
    case 'city':
    case 'user':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function noteKindTone(
  kind: AdminNoteKind,
): 'neutral' | 'brand' | 'danger' {
  switch (kind) {
    case 'handoff':
      return 'brand';
    case 'escalation':
      return 'danger';
    case 'context':
    default:
      return 'neutral';
  }
}

function noteStateTone(
  state: AdminNoteSnapshot['state'],
): 'warning' | 'success' | 'neutral' {
  switch (state) {
    case 'resolved':
      return 'success';
    case 'archived':
      return 'neutral';
    case 'open':
    default:
      return 'warning';
  }
}

function noteAgingTone(
  note: AdminNoteSnapshot,
): 'neutral' | 'warning' | 'danger' {
  switch (deriveAdminNoteAging(note)) {
    case 'critical':
      return 'danger';
    case 'stale':
      return 'warning';
    case 'fresh':
    default:
      return 'neutral';
  }
}

function noteAgingLabel(
  note: AdminNoteSnapshot,
  dictionary: AdminDictionary,
): string {
  switch (deriveAdminNoteAging(note)) {
    case 'critical':
      return dictionary.notesPage.criticalOnly;
    case 'stale':
      return dictionary.notesPage.staleOnly;
    case 'fresh':
    default:
      return dictionary.notesPage.freshOnly;
  }
}

export function NotesFeed({
  notes,
  locale,
  dictionary,
  emptyMessage,
  returnPath,
}: NotesFeedProps) {
  if (notes.length === 0) {
    return <p className="empty-state">{emptyMessage ?? dictionary.notesPage.empty}</p>;
  }

  return (
    <div className="note-feed">
      {notes.map((note) => (
        <article
          key={note.id}
          className={`note-card note-card--${entityTone(note.entityType)}`}
        >
          <div className="route-point__header">
            <div className="status-stack">
              <div className="status-stack">
                <StatusPill tone={noteStateTone(note.state)}>
                  {localizeAdminNoteState(note.state, dictionary)}
                </StatusPill>
                <StatusPill tone={entityStatusTone(note.entityType)}>
                  {noteEntityLabel(note, dictionary)}
                </StatusPill>
                <StatusPill tone={noteKindTone(note.kind)}>
                  {localizeAdminNoteKind(note.kind, dictionary)}
                </StatusPill>
                {note.isPinned ? (
                  <StatusPill tone="warning">
                    {dictionary.notesPanel.pinnedBadge}
                  </StatusPill>
                ) : null}
                <StatusPill tone={noteAgingTone(note)}>
                  {noteAgingLabel(note, dictionary)}
                </StatusPill>
              </div>
              <strong>
                {note.createdByName ??
                  note.createdById ??
                  dictionary.notesPanel.authorFallback}
              </strong>
            </div>
            <span className="timeline-item__date">
              {formatDate(note.createdAt, locale)}
            </span>
          </div>

          <p className="detail-card__description">{note.body}</p>

          <dl className="detail-list">
            <div>
              <dt>{dictionary.table.id}</dt>
              <dd>{note.entityId}</dd>
            </div>
            <div>
              <dt>{dictionary.notesPanel.assigneeLabel}</dt>
              <dd>
                {note.assignedToName ??
                  note.assignedToId ??
                  dictionary.notesPanel.unassignedLabel}
              </dd>
            </div>
            <div>
              <dt>{dictionary.notesPanel.updatedAtLabel}</dt>
              <dd>{formatDate(note.updatedAt, locale)}</dd>
            </div>
            {note.resolvedAt ? (
              <div>
                <dt>{dictionary.notesPanel.resolvedAtLabel}</dt>
                <dd>{formatDate(note.resolvedAt, locale)}</dd>
              </div>
            ) : null}
            {note.archivedAt ? (
              <div>
                <dt>{dictionary.notesPanel.archivedAtLabel}</dt>
                <dd>{formatDate(note.archivedAt, locale)}</dd>
              </div>
            ) : null}
          </dl>

          <form action={updateAdminNoteAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <input type="hidden" name="noteId" value={note.id} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.notesPanel.stateLabel}</span>
                <select name="state" defaultValue={note.state}>
                  <option value="open">
                    {localizeAdminNoteState('open', dictionary)}
                  </option>
                  <option value="resolved">
                    {localizeAdminNoteState('resolved', dictionary)}
                  </option>
                  <option value="archived">
                    {localizeAdminNoteState('archived', dictionary)}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPanel.kindLabel}</span>
                <select name="kind" defaultValue={note.kind}>
                  <option value="context">
                    {localizeAdminNoteKind('context', dictionary)}
                  </option>
                  <option value="handoff">
                    {localizeAdminNoteKind('handoff', dictionary)}
                  </option>
                  <option value="escalation">
                    {localizeAdminNoteKind('escalation', dictionary)}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.notesPanel.assigneeLabel}</span>
                <input
                  name="assignedToId"
                  defaultValue={note.assignedToId ?? ''}
                  placeholder={dictionary.notesPanel.assigneePlaceholder}
                />
              </label>
              <label className="field field--checkbox">
                <span>{dictionary.notesPanel.pinnedLabel}</span>
                <input
                  type="checkbox"
                  name="isPinned"
                  defaultChecked={note.isPinned}
                />
              </label>
            </div>
            <div className="button-row">
              <button
                type="submit"
                className="action-button action-button--ghost"
              >
                {dictionary.forms.save}
              </button>
            </div>
          </form>

          <div className="button-row">
            <Link
              href={noteEntityHref(note, locale)}
              className="action-button action-button--ghost"
            >
              {dictionary.notesPage.openEntity}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
