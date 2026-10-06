import { AppFrame } from "../components/app-frame";
import { ExecutorsPanel } from "../components/executors-panel";
import { FlashBanner } from "../components/flash-banner";
import { MetricCard } from "../components/metric-card";
import { SectionShell } from "../components/section-shell";
import { getAdminPageContext } from "../lib/admin-i18n";
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from "../lib/admin-routing";
import { getBackofficeSnapshot, getExecutorsSnapshot } from "../lib/backoffice";

type ExecutorsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    query?: string | string[];
    verificationStatus?: string | string[];
    onlineState?: string | string[];
    blockedState?: string | string[];
    cityId?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function ExecutorsPage({
  searchParams,
}: ExecutorsPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const searchQuery = getSearchParam(resolvedSearchParams, "query") ?? "";
  const verificationStatus =
    getSearchParam(resolvedSearchParams, "verificationStatus") ?? "";
  const onlineState =
    getSearchParam(resolvedSearchParams, "onlineState") ?? "all";
  const blockedState =
    getSearchParam(resolvedSearchParams, "blockedState") ?? "all";
  const cityId = getSearchParam(resolvedSearchParams, "cityId") ?? "";
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const returnPath = buildReturnPath(
    "/executors",
    resolvedSearchParams,
    locale,
  );
  const [executors, filteredExecutors] = await Promise.all([
    getExecutorsSnapshot({ limit: 100 }),
    getExecutorsSnapshot({
      query: searchQuery || undefined,
      cityId: cityId || undefined,
      verificationStatus:
        verificationStatus === "pending" ||
        verificationStatus === "verified" ||
        verificationStatus === "rejected"
          ? verificationStatus
          : undefined,
      isOnline:
        onlineState === "online"
          ? true
          : onlineState === "offline"
            ? false
            : undefined,
      isBlocked:
        blockedState === "blocked"
          ? true
          : blockedState === "unblocked"
            ? false
            : undefined,
      limit: 100,
    }),
  ]);

  const onlineExecutors = executors.filter(
    (executor) => executor.isOnline,
  ).length;
  const verifiedExecutors = executors.filter(
    (executor) => executor.verificationStatus === "verified",
  ).length;
  const blockedExecutors = executors.filter(
    (executor) => executor.isBlocked,
  ).length;

  return (
    <AppFrame
      current="executors"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.executorsPage.totalExecutorsLabel}
            value={String(executors.length)}
            hint={dictionary.executorsPage.totalExecutorsHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.executorsPage.onlineLabel}
            value={String(onlineExecutors)}
            hint={dictionary.executorsPage.onlineHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.executorsPage.verifiedLabel}
            value={String(verifiedExecutors)}
            hint={dictionary.executorsPage.verifiedHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.executorsPage.blockedLabel}
            value={String(blockedExecutors)}
            hint={dictionary.executorsPage.blockedHint}
            accent="ember"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.executorsPage.eyebrow}
          title={dictionary.executorsPage.filtersTitle}
          description={dictionary.executorsPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.search}</span>
                <input name="query" defaultValue={searchQuery} />
              </label>
              <label className="field">
                <span>{dictionary.forms.verificationStatus}</span>
                <select
                  name="verificationStatus"
                  defaultValue={verificationStatus}
                >
                  <option value="">{dictionary.forms.allStates}</option>
                  <option value="pending">
                    {dictionary.enums.verificationStatus.pending}
                  </option>
                  <option value="verified">
                    {dictionary.enums.verificationStatus.verified}
                  </option>
                  <option value="rejected">
                    {dictionary.enums.verificationStatus.rejected}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.onlineState}</span>
                <select name="onlineState" defaultValue={onlineState}>
                  <option value="all">{dictionary.forms.allStates}</option>
                  <option value="online">{dictionary.forms.onlineOnly}</option>
                  <option value="offline">
                    {dictionary.forms.offlineOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.blockedState}</span>
                <select name="blockedState" defaultValue={blockedState}>
                  <option value="all">{dictionary.forms.allStates}</option>
                  <option value="blocked">
                    {dictionary.forms.blockedOnly}
                  </option>
                  <option value="unblocked">
                    {dictionary.forms.unblockedOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.city}</span>
                <select name="cityId" defaultValue={cityId}>
                  <option value="">{dictionary.forms.allStates}</option>
                  {snapshot.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {locale === "kk" ? city.nameKk : city.nameRu}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a
                href={`/executors?lang=${locale}`}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.executorsPage.eyebrow}
          title={dictionary.executorsPage.title}
          description={dictionary.executorsPage.description}
        >
          <ExecutorsPanel
            executors={filteredExecutors}
            locale={locale}
            dictionary={dictionary}
            returnPath={returnPath}
            showActions
          />
        </SectionShell>
      </main>
    </AppFrame>
  );
}
