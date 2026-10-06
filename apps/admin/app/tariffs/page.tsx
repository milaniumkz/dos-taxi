import { getCreationLabels } from "../lib/creation-i18n";
import { AppFrame } from "../components/app-frame";
import { FlashBanner } from "../components/flash-banner";
import { MetricCard } from "../components/metric-card";
import { SectionShell } from "../components/section-shell";
import { StatusPill } from "../components/status-pill";
import { TariffsPanel } from "../components/tariffs-panel";
import { getAdminPageContext } from "../lib/admin-i18n";
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from "../lib/admin-routing";
import { getBackofficeSnapshot } from "../lib/backoffice";

type TariffsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    query?: string | string[];
    cityId?: string | string[];
    serviceType?: string | string[];
    activeState?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function TariffsPage({ searchParams }: TariffsPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const selectedQuery = getSearchParam(resolvedSearchParams, "query") ?? "";
  const selectedCityId = getSearchParam(resolvedSearchParams, "cityId") ?? "";
  const selectedServiceType =
    getSearchParam(resolvedSearchParams, "serviceType") ?? "";
  const activeState =
    getSearchParam(resolvedSearchParams, "activeState") ?? "all";
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const returnPath = buildReturnPath("/tariffs", resolvedSearchParams, locale);

  const filteredTariffs = snapshot.tariffs.filter((tariff) => {
    if (selectedQuery) {
      const normalizedQuery = selectedQuery.trim().toLowerCase();
      const haystack = [
        tariff.id,
        tariff.nameRu,
        tariff.nameKk,
        tariff.vehicleClass,
        tariff.cityId,
        tariff.serviceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    if (selectedCityId && tariff.cityId !== selectedCityId) {
      return false;
    }
    if (selectedServiceType && tariff.serviceType !== selectedServiceType) {
      return false;
    }
    if (activeState === "active" && !tariff.isActive) {
      return false;
    }
    if (activeState === "inactive" && tariff.isActive) {
      return false;
    }
    return true;
  });

  const activeTariffs = filteredTariffs.filter((tariff) => tariff.isActive);
  const taxiTariffs = filteredTariffs.filter(
    (tariff) => tariff.serviceType === "taxi",
  ).length;
  const deliveryTariffs = filteredTariffs.filter(
    (tariff) => tariff.serviceType === "delivery",
  ).length;

  return (
    <AppFrame
      current="tariffs"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
          <a className="action-button" href={`/tariffs/new?lang=${locale}&cityId=${selectedCityId}`}>{getCreationLabels(locale).newTariff}</a>
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.tariffsPage.totalTariffsLabel}
            value={String(filteredTariffs.length)}
            hint={dictionary.tariffsPage.totalTariffsHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.tariffsPage.activeVersionsLabel}
            value={String(activeTariffs.length)}
            hint={dictionary.tariffsPage.activeVersionsHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.tariffsPage.taxiLabel}
            value={String(taxiTariffs)}
            hint={dictionary.tariffsPage.taxiHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.tariffsPage.deliveryLabel}
            value={String(deliveryTariffs)}
            hint={dictionary.tariffsPage.deliveryHint}
            accent="ember"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.tariffsPage.eyebrow}
          title={dictionary.tariffsPage.filtersTitle}
          description={dictionary.tariffsPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.search}</span>
                <input name="query" defaultValue={selectedQuery} />
              </label>
              <label className="field">
                <span>{dictionary.forms.city}</span>
                <select name="cityId" defaultValue={selectedCityId}>
                  <option value="">{dictionary.forms.allStates}</option>
                  {snapshot.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.nameRu}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.serviceType}</span>
                <select name="serviceType" defaultValue={selectedServiceType}>
                  <option value="">{dictionary.forms.allStates}</option>
                  <option value="taxi">
                    {dictionary.enums.serviceType.taxi}
                  </option>
                  <option value="delivery">
                    {dictionary.enums.serviceType.delivery}
                  </option>
                  <option value="intercity">
                    {dictionary.enums.serviceType.intercity}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.activeState}</span>
                <select name="activeState" defaultValue={activeState}>
                  <option value="all">{dictionary.forms.allStates}</option>
                  <option value="active">{dictionary.forms.activeOnly}</option>
                  <option value="inactive">
                    {dictionary.forms.inactiveOnly}
                  </option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a
                href={`/tariffs?lang=${locale}`}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.tariffsPage.eyebrow}
          title={dictionary.tariffsPage.title}
          description={dictionary.tariffsPage.description}
          aside={
            <StatusPill tone="success">
              {dictionary.tariffsPage.aside(activeTariffs.length)}
            </StatusPill>
          }
        >
          <TariffsPanel
            tariffs={filteredTariffs}
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
