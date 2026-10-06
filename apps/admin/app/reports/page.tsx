import { AppFrame } from '../components/app-frame';
import { MetricCard } from '../components/metric-card';
import { ReportsPanel } from '../components/reports-panel';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import {
  getAdminPageContext,
  getIntlLocale,
  translatePeriod,
} from '../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import {
  getBackofficeSnapshot,
  getFinancialReportSnapshot,
  getOperationsReportSnapshot,
} from '../lib/backoffice';

type ReportsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    period?: string | string[];
    cityId?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const selectedPeriodRaw = getSearchParam(resolvedSearchParams, 'period') ?? 'day';
  const selectedPeriod =
    selectedPeriodRaw === 'week' || selectedPeriodRaw === 'month'
      ? selectedPeriodRaw
      : 'day';
  const selectedCityId = getSearchParam(resolvedSearchParams, 'cityId') ?? '';
  const [financial, operations] = await Promise.all([
    getFinancialReportSnapshot({
      period: selectedPeriod,
      cityId: selectedCityId || undefined,
    }),
    getOperationsReportSnapshot({
      period: selectedPeriod,
      cityId: selectedCityId || undefined,
    }),
  ]);
  const capturedKzt = financial.capturedAmountByCurrency.KZT ?? 0;
  const refundedKzt = financial.refundedAmountByCurrency.KZT ?? 0;
  const localeCode = getIntlLocale(locale);

  return (
    <AppFrame
      current="reports"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <section className="metrics-grid">
          <MetricCard
            label={dictionary.reportsPage.capturedLabel}
            value={new Intl.NumberFormat(localeCode).format(capturedKzt)}
            hint={dictionary.reportsPage.capturedHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.reportsPage.refundedLabel}
            value={new Intl.NumberFormat(localeCode).format(refundedKzt)}
            hint={dictionary.reportsPage.refundedHint}
            accent="ember"
          />
          <MetricCard
            label={dictionary.reportsPage.totalOrdersLabel}
            value={String(operations.totalOrders)}
            hint={dictionary.reportsPage.totalOrdersHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.reportsPage.executorsActiveLabel}
            value={String(operations.activeExecutors)}
            hint={dictionary.reportsPage.executorsActiveHint(
              operations.verifiedExecutors,
            )}
            accent="teal"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.reportsPage.eyebrow}
          title={dictionary.reportsPage.filtersTitle}
          description={dictionary.reportsPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.period}</span>
                <select name="period" defaultValue={selectedPeriod}>
                  <option value="day">{dictionary.periods.day}</option>
                  <option value="week">{dictionary.periods.week}</option>
                  <option value="month">{dictionary.periods.month}</option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.city}</span>
                <select name="cityId" defaultValue={selectedCityId}>
                  <option value="">{dictionary.forms.allStates}</option>
                  {snapshot.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {locale === 'kk' ? city.nameKk : city.nameRu}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a href={`/reports?lang=${locale}`} className="action-button action-button--ghost">
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.reportsPage.eyebrow}
          title={dictionary.reportsPage.title}
          description={dictionary.reportsPage.description}
          aside={
            <StatusPill tone="success">
              {translatePeriod(financial.period, dictionary)}
            </StatusPill>
          }
        >
          <ReportsPanel
            financial={financial}
            operations={operations}
            locale={locale}
            dictionary={dictionary}
          />
        </SectionShell>
      </main>
    </AppFrame>
  );
}
