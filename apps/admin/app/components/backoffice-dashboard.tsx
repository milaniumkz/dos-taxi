import { BackofficeSnapshot, ExecutorSnapshot } from "../lib/backoffice";
import {
  AdminDictionary,
  AdminLocale,
  localizeWarning,
  translatePeriod,
} from "../lib/admin-i18n";
import { deriveSnapshotMetrics, formatMoney } from "../lib/backoffice-view";
import { CitiesPanel } from "./cities-panel";
import { ExecutorsPanel } from "./executors-panel";
import { FlashBanner } from "./flash-banner";
import { MetricCard } from "./metric-card";
import { OrdersTable } from "./orders-table";
import { ReportsPanel } from "./reports-panel";
import { SectionShell } from "./section-shell";
import { StatusPill } from "./status-pill";
import { TariffsPanel } from "./tariffs-panel";

type BackofficeDashboardProps = {
  snapshot: BackofficeSnapshot;
  pendingExecutors: ExecutorSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  notice?: string;
  error?: string;
};

export function BackofficeDashboard({
  snapshot,
  pendingExecutors,
  locale,
  dictionary,
  notice,
  error,
}: BackofficeDashboardProps) {
  const {
    activeOrders,
    searchingOrders,
    deliveryOrders,
    completedOrders,
    activeCities,
    capturedKzt,
    refundedKzt,
  } = deriveSnapshotMetrics(snapshot);

  return (
    <main className="admin-shell">
      <FlashBanner notice={notice} error={error} />

      <section className="admin-hero">
        <div className="admin-hero__copy">
          <span className="eyebrow">{dictionary.shell.eyebrow}</span>
          <h1>{dictionary.dashboard.heroTitle}</h1>
          <p>{dictionary.dashboard.heroDescription}</p>
        </div>
        <div className="admin-hero__meta">
          <StatusPill
            tone={
              snapshot.mode === "live"
                ? "success"
                : snapshot.mode === "mixed"
                  ? "warning"
                  : "neutral"
            }
          >
            {snapshot.mode === "live"
              ? dictionary.shell.liveApi
              : snapshot.mode === "mixed"
                ? dictionary.shell.partialApi
                : dictionary.shell.demoSnapshot}
          </StatusPill>
          <span>{snapshot.sourceLabel}</span>
          <span>{dictionary.dashboard.contourLabel}</span>
        </div>
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="warning-strip">
          {snapshot.warnings.map((warning) => (
            <p key={warning}>{localizeWarning(warning, dictionary)}</p>
          ))}
        </section>
      ) : null}

      <section className="metrics-grid">
        <MetricCard
          label={dictionary.dashboard.activeOrdersLabel}
          value={String(activeOrders.length)}
          hint={dictionary.dashboard.activeOrdersHint(searchingOrders.length)}
          accent="gold"
        />
        <MetricCard
          label={dictionary.dashboard.onlineExecutorsLabel}
          value={String(snapshot.operations.activeExecutors)}
          hint={dictionary.dashboard.onlineExecutorsHint(
            snapshot.operations.verifiedExecutors,
          )}
          accent="teal"
        />
        <MetricCard
          label={dictionary.dashboard.revenueLabel}
          value={formatMoney(capturedKzt, "KZT", locale)}
          hint={dictionary.dashboard.revenueHint(
            snapshot.financial.paymentsCount,
          )}
          accent="ink"
        />
        <MetricCard
          label={dictionary.dashboard.refundsLabel}
          value={formatMoney(refundedKzt, "KZT", locale)}
          hint={dictionary.dashboard.refundsHint(completedOrders.length)}
          accent="ember"
        />
      </section>

      <section className="board-grid">
        <SectionShell
          className="board-grid__wide"
          eyebrow={dictionary.dashboard.pendingExecutorsEyebrow}
          title={dictionary.dashboard.pendingExecutorsTitle}
          description={dictionary.dashboard.pendingExecutorsDescription}
          aside={
            <StatusPill tone="warning">
              {dictionary.dashboard.pendingExecutorsAside(
                pendingExecutors.length,
              )}
            </StatusPill>
          }
        >
          <ExecutorsPanel
            executors={pendingExecutors}
            locale={locale}
            dictionary={dictionary}
            returnPath={`/?lang=${locale}`}
            showActions
          />
        </SectionShell>

        <SectionShell
          className="board-grid__wide"
          eyebrow={dictionary.dashboard.dispatchEyebrow}
          title={dictionary.dashboard.dispatchTitle}
          description={dictionary.dashboard.dispatchDescription}
          aside={
            <StatusPill tone="warning">
              {dictionary.dashboard.dispatchAside(deliveryOrders.length)}
            </StatusPill>
          }
        >
          <OrdersTable
            orders={snapshot.orders.slice(0, 6)}
            locale={locale}
            dictionary={dictionary}
          />
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.dashboard.citiesEyebrow}
          title={dictionary.dashboard.citiesTitle}
          description={dictionary.dashboard.citiesDescription}
          aside={
            <StatusPill tone="brand">
              {dictionary.dashboard.citiesAside(activeCities.length)}
            </StatusPill>
          }
        >
          <CitiesPanel
            cities={snapshot.cities}
            locale={locale}
            dictionary={dictionary}
          />
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.dashboard.tariffsEyebrow}
          title={dictionary.dashboard.tariffsTitle}
          description={dictionary.dashboard.tariffsDescription}
        >
          <TariffsPanel
            tariffs={snapshot.tariffs}
            locale={locale}
            dictionary={dictionary}
          />
        </SectionShell>

        <SectionShell
          className="board-grid__wide"
          eyebrow={dictionary.dashboard.reportsEyebrow}
          title={dictionary.dashboard.reportsTitle}
          description={dictionary.dashboard.reportsDescription}
          aside={
            <StatusPill tone="success">
              {translatePeriod(snapshot.financial.period, dictionary)}
            </StatusPill>
          }
        >
          <ReportsPanel
            financial={snapshot.financial}
            operations={snapshot.operations}
            locale={locale}
            dictionary={dictionary}
          />
        </SectionShell>
      </section>
    </main>
  );
}
