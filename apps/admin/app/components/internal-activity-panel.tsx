import Link from 'next/link';

import {
  AdminDictionary,
  AdminLocale,
} from '../lib/admin-i18n';
import {
  type AdminActivityEntityType,
  type AdminActivitySnapshot,
} from '../lib/backoffice';
import { formatDate } from '../lib/backoffice-view';
import { ActivityFeed } from './activity-feed';
import { MetricCard } from './metric-card';
import { SectionShell } from './section-shell';

type InternalActivityPanelProps = {
  activity: AdminActivitySnapshot[];
  entityType: AdminActivityEntityType;
  entityId: string;
  locale: AdminLocale;
  dictionary: AdminDictionary;
};

function buildEntityActivityHref(
  locale: AdminLocale,
  entityType: AdminActivityEntityType,
  entityId: string,
): string {
  const params = new URLSearchParams();
  params.set('lang', locale);
  params.set('entityType', entityType);
  params.set('entityId', entityId);
  return `/activity?${params.toString()}`;
}

function uniqueActorCount(activity: AdminActivitySnapshot[]): number {
  return new Set(
    activity.map((entry) => entry.actorId ?? entry.actorName ?? 'system'),
  ).size;
}

export function InternalActivityPanel({
  activity,
  entityType,
  entityId,
  locale,
  dictionary,
}: InternalActivityPanelProps) {
  const noteOpsCount = activity.filter((entry) =>
    entry.action.startsWith('note.'),
  ).length;
  const latestEntry = activity[0] ?? null;

  return (
    <SectionShell
      eyebrow={dictionary.activityPanel.eyebrow}
      title={dictionary.activityPanel.title}
      description={dictionary.activityPanel.description}
      aside={
        <Link
          href={buildEntityActivityHref(locale, entityType, entityId)}
          className="action-button action-button--ghost"
        >
          {dictionary.activityPanel.openFeedLabel}
        </Link>
      }
    >
      <section className="metrics-grid">
        <MetricCard
          label={dictionary.activityPanel.totalLabel}
          value={String(activity.length)}
          hint={dictionary.activityPanel.totalHint}
          accent="gold"
        />
        <MetricCard
          label={dictionary.activityPanel.actorCountLabel}
          value={String(uniqueActorCount(activity))}
          hint={dictionary.activityPanel.actorCountHint}
          accent="teal"
        />
        <MetricCard
          label={dictionary.activityPanel.noteOpsLabel}
          value={String(noteOpsCount)}
          hint={dictionary.activityPanel.noteOpsHint}
          accent="ink"
        />
        <MetricCard
          label={dictionary.activityPanel.latestLabel}
          value={latestEntry ? formatDate(latestEntry.createdAt, locale) : '—'}
          hint={dictionary.activityPanel.latestHint}
          accent="ember"
        />
      </section>

      <ActivityFeed
        activity={activity}
        locale={locale}
        dictionary={dictionary}
        emptyMessage={dictionary.activityPanel.empty}
        baseFilters={{ entityType, entityId }}
      />
    </SectionShell>
  );
}
