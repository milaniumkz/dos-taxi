import Link from "next/link";

import { AppFrame } from "../components/app-frame";
import { FlashBanner } from "../components/flash-banner";
import { MetricCard } from "../components/metric-card";
import { SectionShell } from "../components/section-shell";
import { StatusPill } from "../components/status-pill";
import { updateExecutorBalanceTopUpAction } from "../lib/admin-actions";
import { getAdminPageContext } from "../lib/admin-i18n";
import {
  buildPathWithOverrides,
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from "../lib/admin-routing";
import {
  ExecutorBalanceTopUpSnapshot,
  getBackofficeSnapshot,
  getExecutorBalanceTopUpsSnapshot,
} from "../lib/backoffice";
import { formatDate, formatNumber } from "../lib/backoffice-view";

type BalanceTopUpsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    status?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

type BalanceTopUpStatus = ExecutorBalanceTopUpSnapshot["status"];

const BALANCE_TOP_UP_STATUSES: BalanceTopUpStatus[] = [
  "pending",
  "invoiced",
  "confirmed",
  "rejected",
];

function normalizeStatus(value: string | undefined): BalanceTopUpStatus | "" {
  return BALANCE_TOP_UP_STATUSES.includes(value as BalanceTopUpStatus)
    ? (value as BalanceTopUpStatus)
    : "";
}

function statusTone(
  status: BalanceTopUpStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "confirmed") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  if (status === "invoiced") {
    return "warning";
  }
  return "neutral";
}

export default async function BalanceTopUpsPage({
  searchParams,
}: BalanceTopUpsPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const selectedStatus = normalizeStatus(
    getSearchParam(resolvedSearchParams, "status"),
  );
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const returnPath = buildReturnPath(
    "/balance-topups",
    resolvedSearchParams,
    locale,
  );
  const allTopUps = await getExecutorBalanceTopUpsSnapshot();
  const topUps = selectedStatus
    ? allTopUps.filter((topUp) => topUp.status === selectedStatus)
    : allTopUps;
  const activeTopUps = selectedStatus
    ? topUps
    : allTopUps.filter(
        (topUp) => topUp.status === "pending" || topUp.status === "invoiced",
      );
  const historyTopUps = selectedStatus
    ? []
    : allTopUps.filter(
        (topUp) => topUp.status === "confirmed" || topUp.status === "rejected",
      );
  const pendingCount = allTopUps.filter(
    (topUp) => topUp.status === "pending",
  ).length;
  const invoicedCount = allTopUps.filter(
    (topUp) => topUp.status === "invoiced",
  ).length;
  const confirmedCount = allTopUps.filter(
    (topUp) => topUp.status === "confirmed",
  ).length;

  return (
    <AppFrame
      current="balanceTopUps"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.balanceTopUpsPage.totalLabel}
            value={String(topUps.length)}
            hint={dictionary.balanceTopUpsPage.totalHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.balanceTopUpsPage.pendingLabel}
            value={String(pendingCount)}
            hint={dictionary.balanceTopUpsPage.pendingHint}
            accent="ember"
          />
          <MetricCard
            label={dictionary.balanceTopUpsPage.invoicedLabel}
            value={String(invoicedCount)}
            hint={dictionary.balanceTopUpsPage.invoicedHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.balanceTopUpsPage.confirmedLabel}
            value={String(confirmedCount)}
            hint={dictionary.balanceTopUpsPage.confirmedHint}
            accent="ink"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.balanceTopUpsPage.eyebrow}
          title={dictionary.balanceTopUpsPage.filtersTitle}
          description={dictionary.balanceTopUpsPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.status}</span>
                <select name="status" defaultValue={selectedStatus}>
                  <option value="">
                    {dictionary.balanceTopUpsPage.allStatuses}
                  </option>
                  {BALANCE_TOP_UP_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {dictionary.balanceTopUpsPage.status[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <Link
                href={buildPathWithOverrides(
                  "/balance-topups",
                  resolvedSearchParams,
                  locale,
                  { status: undefined },
                )}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </Link>
            </div>
          </form>
        </SectionShell>

        <BalanceTopUpList
          title={
            selectedStatus
              ? dictionary.balanceTopUpsPage.listTitle
              : dictionary.balanceTopUpsPage.activeListTitle
          }
          description={
            selectedStatus
              ? dictionary.balanceTopUpsPage.listDescription
              : dictionary.balanceTopUpsPage.activeListDescription
          }
          topUps={activeTopUps}
          locale={locale}
          emptyLabel={dictionary.balanceTopUpsPage.empty}
          returnPath={returnPath}
          dictionary={dictionary}
        />

        {!selectedStatus && (
          <BalanceTopUpList
            title={dictionary.balanceTopUpsPage.historyTitle}
            description={dictionary.balanceTopUpsPage.historyDescription}
            topUps={historyTopUps}
            locale={locale}
            emptyLabel={dictionary.balanceTopUpsPage.empty}
            returnPath={returnPath}
            dictionary={dictionary}
            readOnly
          />
        )}
      </main>
    </AppFrame>
  );
}

function BalanceTopUpList({
  title,
  description,
  topUps,
  locale,
  emptyLabel,
  returnPath,
  dictionary,
  readOnly = false,
}: {
  title: string;
  description: string;
  topUps: ExecutorBalanceTopUpSnapshot[];
  locale: "ru" | "kk";
  emptyLabel: string;
  returnPath: string;
  dictionary: Awaited<ReturnType<typeof getAdminPageContext>>["dictionary"];
  readOnly?: boolean;
}) {
  return (
    <SectionShell
      eyebrow={dictionary.balanceTopUpsPage.eyebrow}
      title={title}
      description={description}
    >
      {topUps.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <div className="actor-grid">
          {topUps.map((topUp) => {
            const canManage =
              !readOnly &&
              (topUp.status === "pending" || topUp.status === "invoiced");
            return (
              <article key={topUp.id} className="actor-card">
                <div className="actor-card__top">
                  <div>
                    <h3>
                      {topUp.executorName ||
                        topUp.executorPhone ||
                        topUp.executorId}
                    </h3>
                    <p>
                      {dictionary.balanceTopUpsPage.phoneLabel}: {topUp.phone}
                    </p>
                  </div>
                  <StatusPill tone={statusTone(topUp.status)}>
                    {dictionary.balanceTopUpsPage.status[topUp.status]}
                  </StatusPill>
                </div>

                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.forms.amount}</dt>
                    <dd>{formatNumber(topUp.amount, locale, 2)} ₸</dd>
                  </div>
                  <div>
                    <dt>{dictionary.balanceTopUpsPage.requestedAtLabel}</dt>
                    <dd>{formatDate(topUp.createdAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.balanceTopUpsPage.updatedAtLabel}</dt>
                    <dd>{formatDate(topUp.updatedAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.balanceTopUpsPage.executorLabel}</dt>
                    <dd>
                      <Link
                        href={`/executors/${topUp.executorId}?lang=${locale}`}
                        className="table-link"
                      >
                        {dictionary.balanceTopUpsPage.openExecutor}
                      </Link>
                    </dd>
                  </div>
                </dl>

                {canManage && (
                  <form
                    action={updateExecutorBalanceTopUpAction}
                    className="admin-form admin-form--card"
                  >
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input type="hidden" name="topUpId" value={topUp.id} />
                    <label className="field">
                      <span>
                        {dictionary.balanceTopUpsPage.creditAmountLabel}
                      </span>
                      <input name="amount" defaultValue={topUp.amount} />
                    </label>
                    <label className="field">
                      <span>
                        {dictionary.balanceTopUpsPage.adminCommentLabel}
                      </span>
                      <input
                        name="adminComment"
                        defaultValue={topUp.adminComment ?? ""}
                        placeholder={
                          dictionary.balanceTopUpsPage.adminCommentPlaceholder
                        }
                      />
                    </label>
                    <div className="button-row">
                      <button
                        type="submit"
                        name="status"
                        value="invoiced"
                        className="action-button action-button--ghost"
                      >
                        {dictionary.balanceTopUpsPage.markInvoiced}
                      </button>
                      <button
                        type="submit"
                        name="status"
                        value="confirmed"
                        className="action-button"
                      >
                        {dictionary.balanceTopUpsPage.confirmAndCredit}
                      </button>
                      <button
                        type="submit"
                        name="status"
                        value="rejected"
                        className="action-button action-button--ghost"
                      >
                        {dictionary.balanceTopUpsPage.reject}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
