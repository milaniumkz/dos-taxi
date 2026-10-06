import Link from 'next/link';

import {
  createAdminNoteAction,
  updateAdminNoteAction,
} from '../lib/admin-actions';
import {
  AdminDictionary,
  AdminLocale,
  localizeAdminNoteKind,
  localizeAdminNoteState,
} from '../lib/admin-i18n';
import {
  type AdminNoteKind,
  type AdminNoteEntityType,
  type AdminNoteSnapshot,
} from '../lib/backoffice';
import { formatDate } from '../lib/backoffice-view';
import { SectionShell } from './section-shell';
import { StatusPill } from './status-pill';

type InternalNotesPanelProps = {
  notes: AdminNoteSnapshot[];
  entityType: AdminNoteEntityType;
  entityId: string;
  locale: AdminLocale;
  dictionary: AdminDictionary;
  returnPath: string;
};

function buildEntityNotesHref(
  locale: AdminLocale,
  entityType: AdminNoteEntityType,
  entityId: string,
  filters: {
    state?: 'open' | 'resolved' | 'archived';
    kind?: AdminNoteKind;
  } = {},
): string {
  const params = new URLSearchParams();
  params.set('lang', locale);
  params.set('entityType', entityType);
  params.set('entityId', entityId);
  if (filters.state) {
    params.set('state', filters.state);
  }
  if (filters.kind) {
    params.set('kind', filters.kind);
  }
  return `/notes?${params.toString()}`;
}

function buildEntityActivityHref(
  locale: AdminLocale,
  entityType: AdminNoteEntityType,
  entityId: string,
): string {
  const params = new URLSearchParams();
  params.set('lang', locale);
  params.set('entityType', entityType);
  params.set('entityId', entityId);
  return `/activity?${params.toString()}`;
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

export function InternalNotesPanel({
  notes,
  entityType,
  entityId,
  locale,
  dictionary,
  returnPath,
}: InternalNotesPanelProps) {
  return (
    <SectionShell
      eyebrow={dictionary.notesPanel.eyebrow}
      title={dictionary.notesPanel.title}
      description={dictionary.notesPanel.description}
      aside={
        <div className="button-row">
          <Link
            href={buildEntityNotesHref(locale, entityType, entityId)}
            className="action-button action-button--ghost"
          >
            {dictionary.notesPanel.openFeedLabel}
          </Link>
          <Link
            href={buildEntityNotesHref(locale, entityType, entityId, {
              state: 'open',
            })}
            className="action-button action-button--ghost"
          >
            {dictionary.notesPanel.openQueueLabel}
          </Link>
          <Link
            href={buildEntityNotesHref(locale, entityType, entityId, {
              state: 'open',
              kind: 'escalation',
            })}
            className="action-button action-button--ghost"
          >
            {dictionary.notesPanel.openEscalationsLabel}
          </Link>
          <Link
            href={buildEntityActivityHref(locale, entityType, entityId)}
            className="action-button action-button--ghost"
          >
            {dictionary.notesPanel.openActivityLabel}
          </Link>
        </div>
      }
    >
      <article className="detail-card">
        <h3>{dictionary.notesPanel.createTitle}</h3>
        <p className="detail-card__description">
          {dictionary.notesPanel.createDescription}
        </p>
        <form action={createAdminNoteAction} className="admin-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          <div className="admin-form__grid">
            <label className="field">
              <span>{dictionary.notesPanel.kindLabel}</span>
              <select name="kind" defaultValue="context">
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
              <span>{dictionary.notesPanel.pinnedLabel}</span>
              <select name="isPinned" defaultValue="false">
                <option value="false">{dictionary.notesPanel.pinnedOff}</option>
                <option value="true">{dictionary.notesPanel.pinnedOn}</option>
              </select>
            </label>
            <label className="field">
              <span>{dictionary.notesPanel.assigneeLabel}</span>
              <input
                name="assignedToId"
                placeholder={dictionary.notesPanel.assigneePlaceholder}
              />
            </label>
          </div>
          <label className="field">
            <span>{dictionary.forms.notes}</span>
            <textarea
              name="body"
              rows={4}
              maxLength={2000}
              placeholder={dictionary.notesPanel.bodyPlaceholder}
              required
            />
          </label>
          <div className="button-row">
            <button type="submit" className="action-button action-button--soft">
              {dictionary.forms.addNote}
            </button>
          </div>
        </form>
      </article>

      {notes.length > 0 ? (
        <div className="timeline-list">
          {notes.map((note) => (
            <article key={note.id} className="timeline-item">
              <div className="route-point__header">
                <div className="status-stack">
                  <div className="status-stack">
                    <StatusPill tone={noteStateTone(note.state)}>
                      {localizeAdminNoteState(note.state, dictionary)}
                    </StatusPill>
                    <StatusPill tone={noteKindTone(note.kind)}>
                      {localizeAdminNoteKind(note.kind, dictionary)}
                    </StatusPill>
                    {note.isPinned ? (
                      <StatusPill tone="warning">
                        {dictionary.notesPanel.pinnedBadge}
                      </StatusPill>
                    ) : null}
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
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">{dictionary.notesPanel.empty}</p>
      )}
    </SectionShell>
  );
}
