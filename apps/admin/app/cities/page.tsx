import { AppFrame } from '../components/app-frame';
import { CitiesPanel } from '../components/cities-panel';
import { FlashBanner } from '../components/flash-banner';
import { MetricCard } from '../components/metric-card';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import { createCityAction } from '../lib/admin-actions';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import { getBackofficeSnapshot } from '../lib/backoffice';

type CitiesPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    query?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function CitiesPage({ searchParams }: CitiesPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const selectedQuery = getSearchParam(resolvedSearchParams, 'query') ?? '';
  const filteredCities = snapshot.cities.filter((city) => {
    if (!selectedQuery) {
      return true;
    }

    const normalizedQuery = selectedQuery.trim().toLowerCase();
    const haystack = [
      city.id,
      city.nameRu,
      city.nameKk,
      city.countryCode,
      city.timezone,
      city.currency,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
  const filteredActiveCities = filteredCities.filter((city) => city.isActive);
  const standbyCities = filteredCities.length - filteredActiveCities.length;
  const kzCities = filteredCities.filter((city) => city.countryCode === 'KZ').length;
  const returnPath = buildReturnPath('/cities', resolvedSearchParams, locale);
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');

  return (
    <AppFrame
      current="cities"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.citiesPage.totalCitiesLabel}
            value={String(filteredCities.length)}
            hint={dictionary.citiesPage.totalCitiesHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.citiesPage.activeLabel}
            value={String(filteredActiveCities.length)}
            hint={dictionary.citiesPage.activeHint}
            accent="teal"
          />
          <MetricCard
            label={dictionary.citiesPage.standbyLabel}
            value={String(standbyCities)}
            hint={dictionary.citiesPage.standbyHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.citiesPage.marketsLabel}
            value={String(kzCities)}
            hint={dictionary.citiesPage.marketsHint}
            accent="ember"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.citiesPage.eyebrow}
          title={dictionary.citiesPage.filtersTitle}
          description={dictionary.citiesPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.search}</span>
                <input
                  name="query"
                  defaultValue={selectedQuery}
                  placeholder={dictionary.forms.city}
                />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a href={`/cities?lang=${locale}`} className="action-button action-button--ghost">
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.citiesPage.eyebrow}
          title={dictionary.citiesPage.title}
          description={dictionary.citiesPage.description}
          aside={
            <StatusPill tone="brand">
              {dictionary.citiesPage.aside(filteredActiveCities.length)}
            </StatusPill>
          }
        >
          <CitiesPanel
            cities={filteredCities}
            locale={locale}
            dictionary={dictionary}
            returnPath={returnPath}
            showActions
          />
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.citiesPage.eyebrow}
          title={dictionary.citiesPage.createTitle}
          description={dictionary.citiesPage.createDescription}
        >
          <form action={createCityAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.nameRu}</span>
                <input name="nameRu" required />
              </label>
              <label className="field">
                <span>{dictionary.forms.nameKk}</span>
                <input name="nameKk" required />
              </label>
              <label className="field">
                <span>{dictionary.forms.countryCode}</span>
                <input name="countryCode" defaultValue="KZ" required />
              </label>
              <label className="field">
                <span>{dictionary.forms.currency}</span>
                <select name="currency" defaultValue="KZT">
                  <option value="KZT">{dictionary.forms.currencyKzt}</option>
                  <option value="RUB">{dictionary.forms.currencyRub}</option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.timezone}</span>
                <input name="timezone" defaultValue="Asia/Almaty" required />
              </label>
              <label className="field field--checkbox">
                <input name="isActive" type="checkbox" defaultChecked />
                <span>{dictionary.forms.isActive}</span>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.create}
              </button>
            </div>
          </form>
        </SectionShell>
      </main>
    </AppFrame>
  );
}
