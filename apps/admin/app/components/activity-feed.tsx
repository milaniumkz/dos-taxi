import Link from "next/link";

import {
  AdminDictionary,
  AdminLocale,
  buildLocalizedHref,
  localizeAdminActivityAction,
  localizeAdminActivityEntityType,
  localizeAdminNoteKind,
  localizeAdminNoteState,
  translateDeliveryStatus,
  translateExecutorType,
  translateOrderStatus,
  translatePaymentMethod,
  translatePaymentStatus,
  translateServiceType,
  translateVehicleType,
  translateVerificationStatus,
} from "../lib/admin-i18n";
import {
  type AdminActivityEntityType,
  type AdminActivitySnapshot,
} from "../lib/backoffice";
import { formatDate, formatMoney, formatNumber } from "../lib/backoffice-view";
import { StatusPill } from "./status-pill";

type ActivityFeedProps = {
  activity: AdminActivitySnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  emptyMessage?: string;
  baseFilters?: {
    entityType?: AdminActivityEntityType;
    entityId?: string;
  };
};

function buildPageHref(
  path: string,
  locale: AdminLocale,
  params: Record<string, string | undefined>,
): string {
  const searchParams = new URLSearchParams();
  searchParams.set("lang", locale);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  return `${path}?${searchParams.toString()}`;
}

function actionTone(
  action: AdminActivitySnapshot["action"],
): "brand" | "danger" | "success" | "neutral" {
  if (action.startsWith("payment.")) {
    return "danger";
  }
  if (action.startsWith("order.")) {
    return "brand";
  }
  if (action.startsWith("note.")) {
    return "neutral";
  }
  return "success";
}

function entityTone(
  entityType: AdminActivitySnapshot["entityType"],
): "gold" | "teal" | "ink" {
  switch (entityType) {
    case "executor":
    case "payment":
      return "teal";
    case "user":
    case "city":
      return "ink";
    case "order":
    case "tariff":
    case "promo_code":
    default:
      return "gold";
  }
}

function entityStatusTone(
  entityType: AdminActivitySnapshot["entityType"],
): "brand" | "success" | "neutral" {
  switch (entityType) {
    case "executor":
    case "payment":
      return "success";
    case "user":
    case "city":
      return "neutral";
    case "order":
    case "tariff":
    case "promo_code":
    default:
      return "brand";
  }
}

function entityHref(entry: AdminActivitySnapshot, locale: AdminLocale): string {
  switch (entry.entityType) {
    case "user":
      return buildLocalizedHref(`/users/${entry.entityId}`, locale);
    case "executor":
      return buildLocalizedHref(`/executors/${entry.entityId}`, locale);
    case "city":
      return buildLocalizedHref(`/cities/${entry.entityId}`, locale);
    case "tariff":
      return buildLocalizedHref(`/tariffs/${entry.entityId}`, locale);
    case "promo_code":
      return buildLocalizedHref(`/promo-codes/${entry.entityId}`, locale);
    case "payment": {
      const orderId =
        entry.metadata && typeof entry.metadata.orderId === "string"
          ? entry.metadata.orderId
          : null;
      return buildLocalizedHref(
        orderId ? `/orders/${orderId}` : "/orders",
        locale,
      );
    }
    case "order":
    default:
      return buildLocalizedHref(`/orders/${entry.entityId}`, locale);
  }
}

function buildActivityFilterHref(
  locale: AdminLocale,
  filters: {
    entityType?: AdminActivityEntityType;
    entityId?: string;
    action?: AdminActivitySnapshot["action"];
    actorId?: string | null;
    actorQuery?: string | null;
  },
): string {
  const params = new URLSearchParams();
  params.set("lang", locale);
  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }
  if (filters.entityId) {
    params.set("entityId", filters.entityId);
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.actorId) {
    params.set("actorId", filters.actorId);
  } else if (filters.actorQuery) {
    params.set("actorQuery", filters.actorQuery);
  }
  return `/activity?${params.toString()}`;
}

function actorHref(
  entry: AdminActivitySnapshot,
  locale: AdminLocale,
  baseFilters?: ActivityFeedProps["baseFilters"],
): string | null {
  if (entry.actorId) {
    return buildActivityFilterHref(locale, {
      entityType: baseFilters?.entityType,
      entityId: baseFilters?.entityId,
      actorId: entry.actorId,
    });
  }
  if (entry.actorName) {
    return buildActivityFilterHref(locale, {
      entityType: baseFilters?.entityType,
      entityId: baseFilters?.entityId,
      actorQuery: entry.actorName,
    });
  }
  return null;
}

function metadataFieldLabel(key: string, dictionary: AdminDictionary): string {
  switch (key) {
    case "orderId":
      return dictionary.forms.orderId;
    case "executorId":
      return dictionary.forms.executorId;
    case "userId":
    case "clientId":
      return dictionary.forms.userId;
    case "cityId":
      return dictionary.forms.city;
    case "amount":
      return dictionary.forms.amount;
    case "reason":
      return dictionary.forms.reason;
    case "status":
      return dictionary.forms.status;
    case "serviceType":
      return dictionary.forms.serviceType;
    case "kind":
      return dictionary.notesPanel.kindLabel;
    case "state":
      return dictionary.notesPanel.stateLabel;
    case "isPinned":
      return dictionary.notesPanel.pinnedLabel;
    case "assignedToId":
      return dictionary.notesPanel.assigneeLabel;
    case "noteId":
      return dictionary.forms.noteId;
    case "source":
      return dictionary.forms.source;
    case "previousTariffId":
      return dictionary.forms.previousTariffId;
    case "discountType":
      return dictionary.forms.discountType;
    case "vehicleClass":
      return dictionary.forms.vehicleClass;
    case "timezone":
      return dictionary.forms.timezone;
    case "code":
      return dictionary.forms.code;
    case "currency":
      return dictionary.forms.currency;
    case "isBlocked":
      return dictionary.forms.blockedState;
    case "isActive":
      return dictionary.forms.isActive;
    case "executorType":
      return dictionary.forms.executorType;
    case "vehicleType":
      return dictionary.forms.vehicleType;
    case "verificationStatus":
      return dictionary.forms.verificationStatus;
    default:
      return key;
  }
}

function metadataFieldHref(
  key: string,
  value: unknown,
  entry: AdminActivitySnapshot,
  locale: AdminLocale,
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  switch (key) {
    case "orderId":
      return buildLocalizedHref(`/orders/${value}`, locale);
    case "executorId":
      return buildLocalizedHref(`/executors/${value}`, locale);
    case "userId":
    case "clientId":
    case "assignedToId":
    case "actorId":
      return buildLocalizedHref(`/users/${value}`, locale);
    case "cityId":
      return buildLocalizedHref(`/cities/${value}`, locale);
    case "previousTariffId":
      return buildLocalizedHref(`/tariffs/${value}`, locale);
    case "code":
      if (entry.entityType === "promo_code") {
        return buildLocalizedHref(`/promo-codes/${entry.entityId}`, locale);
      }
      return buildPageHref("/promo-codes", locale, {
        query: value,
      });
    case "noteId":
      if (
        entry.entityType === "order" ||
        entry.entityType === "user" ||
        entry.entityType === "executor"
      ) {
        return buildPageHref("/notes", locale, {
          entityType: entry.entityType,
          entityId: entry.entityId,
          query: value,
        });
      }
      return buildPageHref("/notes", locale, {
        query: value,
      });
    default:
      return null;
  }
}

function formatMetadataValue(
  key: string,
  value: unknown,
  entry: AdminActivitySnapshot,
  locale: AdminLocale,
  dictionary: AdminDictionary,
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value
      ? dictionary.orderDetailPage.yes
      : dictionary.orderDetailPage.no;
  }

  if (key === "kind" && typeof value === "string") {
    if (value === "context" || value === "handoff" || value === "escalation") {
      return localizeAdminNoteKind(value, dictionary);
    }
  }

  if (key === "state" && typeof value === "string") {
    if (value === "open" || value === "resolved" || value === "archived") {
      return localizeAdminNoteState(value, dictionary);
    }
  }

  if (key === "serviceType" && typeof value === "string") {
    if (
      value === "taxi" ||
      value === "delivery" ||
      value === "intercity" ||
      value === "cargo" ||
      value === "scooter"
    ) {
      return translateServiceType(value, dictionary);
    }
  }

  if (key === "paymentMethod" && typeof value === "string") {
    if (
      value === "card" ||
      value === "cash" ||
      value === "corporate" ||
      value === "bonus"
    ) {
      return translatePaymentMethod(value, dictionary);
    }
  }

  if (key === "status" && typeof value === "string") {
    if (
      value === "draft" ||
      value === "searching" ||
      value === "accepted" ||
      value === "arriving" ||
      value === "waiting" ||
      value === "in_progress" ||
      value === "delivered" ||
      value === "completed" ||
      value === "cancelled_client" ||
      value === "cancelled_executor" ||
      value === "cancelled_system" ||
      value === "failed"
    ) {
      return translateOrderStatus(value, dictionary);
    }

    if (
      value === "pending" ||
      value === "authorized" ||
      value === "captured" ||
      value === "refunded" ||
      value === "partially_refunded" ||
      value === "cancelled" ||
      value === "failed"
    ) {
      return translatePaymentStatus(value, dictionary);
    }
  }

  if (key === "deliveryStatus" && typeof value === "string") {
    if (
      value === "pending_pickup" ||
      value === "picked_up" ||
      value === "in_transit" ||
      value === "at_door" ||
      value === "delivered_confirmed" ||
      value === "delivery_failed" ||
      value === "returning"
    ) {
      return translateDeliveryStatus(value, dictionary);
    }
  }

  if (key === "executorType" && typeof value === "string") {
    if (value === "driver" || value === "courier" || value === "cargo_driver") {
      return translateExecutorType(value, dictionary);
    }
  }

  if (key === "vehicleType" && typeof value === "string") {
    if (
      value === "bicycle" ||
      value === "moped" ||
      value === "scooter" ||
      value === "car"
    ) {
      return translateVehicleType(value, dictionary);
    }
  }

  if (key === "verificationStatus" && typeof value === "string") {
    if (value === "pending" || value === "verified" || value === "rejected") {
      return translateVerificationStatus(value, dictionary);
    }
  }

  if (key === "discountType" && typeof value === "string") {
    if (value === "percent") {
      return dictionary.forms.percent;
    }
    if (value === "fixed") {
      return dictionary.forms.fixed;
    }
  }

  if (
    (key === "amount" ||
      key === "discountValue" ||
      key === "refundedAmount" ||
      key === "bonusBalance" ||
      key === "balance") &&
    (typeof value === "number" || typeof value === "string")
  ) {
    const currency =
      entry.metadata && typeof entry.metadata.currency === "string"
        ? entry.metadata.currency
        : null;

    if (currency === "RUB" || currency === "KZT") {
      return formatMoney(value, currency, locale);
    }

    return formatNumber(value, locale);
  }

  if (typeof value === "number") {
    return formatNumber(value, locale);
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function metadataEntries(
  entry: AdminActivitySnapshot,
  locale: AdminLocale,
  dictionary: AdminDictionary,
) {
  const metadata = entry.metadata;
  if (!metadata || Object.keys(metadata).length === 0) {
    return [];
  }

  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: metadataFieldLabel(key, dictionary),
      value: formatMetadataValue(key, value, entry, locale, dictionary),
      href: metadataFieldHref(key, value, entry, locale),
    }));
}

export function ActivityFeed({
  activity,
  locale,
  dictionary,
  emptyMessage,
  baseFilters,
}: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <p className="empty-state">
        {emptyMessage ?? dictionary.activityPage.empty}
      </p>
    );
  }

  return (
    <div className="note-feed">
      {activity.map((entry) =>
        (() => {
          const relatedActorHref = actorHref(entry, locale, baseFilters);
          const fields = metadataEntries(entry, locale, dictionary);

          return (
            <article
              key={entry.id}
              className={`note-card note-card--${entityTone(entry.entityType)}`}
            >
              <div className="route-point__header">
                <div className="status-stack">
                  <div className="status-stack">
                    <StatusPill tone={entityStatusTone(entry.entityType)}>
                      {localizeAdminActivityEntityType(
                        entry.entityType,
                        dictionary,
                      )}
                    </StatusPill>
                    <StatusPill tone={actionTone(entry.action)}>
                      {localizeAdminActivityAction(entry.action, dictionary)}
                    </StatusPill>
                  </div>
                  <strong>
                    {entry.actorName ??
                      entry.actorId ??
                      dictionary.activityPage.systemActorLabel}
                  </strong>
                </div>
                <span className="timeline-item__date">
                  {formatDate(entry.createdAt, locale)}
                </span>
              </div>

              <dl className="detail-list">
                <div>
                  <dt>{dictionary.table.id}</dt>
                  <dd>{entry.entityId}</dd>
                </div>
                <div>
                  <dt>{dictionary.activityPage.actorLabel}</dt>
                  <dd>
                    {entry.actorName ??
                      entry.actorId ??
                      dictionary.activityPage.systemActorLabel}
                  </dd>
                </div>
                <div>
                  <dt>{dictionary.activityPage.actionLabel}</dt>
                  <dd>
                    {localizeAdminActivityAction(entry.action, dictionary)}
                  </dd>
                </div>
                {fields.map((field) => (
                  <div key={`${entry.id}-${field.key}`}>
                    <dt>{field.label}</dt>
                    <dd>
                      {field.href ? (
                        <Link href={field.href} className="action-link">
                          {field.value}
                        </Link>
                      ) : (
                        field.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="button-row">
                <Link
                  href={entityHref(entry, locale)}
                  className="action-button action-button--ghost"
                >
                  {dictionary.activityPage.openEntity}
                </Link>
                {relatedActorHref ? (
                  <Link
                    href={relatedActorHref}
                    className="action-button action-button--ghost"
                  >
                    {dictionary.activityPage.openActorLabel}
                  </Link>
                ) : null}
                <Link
                  href={buildActivityFilterHref(locale, {
                    entityType: baseFilters?.entityType,
                    entityId: baseFilters?.entityId,
                    action: entry.action,
                  })}
                  className="action-button action-button--ghost"
                >
                  {dictionary.activityPage.openActionLabel}
                </Link>
              </div>
            </article>
          );
        })(),
      )}
    </div>
  );
}
