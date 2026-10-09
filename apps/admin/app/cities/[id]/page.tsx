import { getCreationLabels } from "../../lib/creation-i18n";
import Link from 'next/link';

import { AppFrame } from '../../components/app-frame';
import { FlashBanner } from '../../components/flash-banner';
import { InternalActivityPanel } from '../../components/internal-activity-panel';
import { InternalNotesPanel } from '../../components/internal-notes-panel';
import { MetricCard } from '../../components/metric-card';
import { OrdersTable } from '../../components/orders-table';
import { SectionShell } from '../../components/section-shell';
import { TariffsPanel } from '../../components/tariffs-panel';
import { updateCityAction } from '../../lib/admin-actions';
import { getAdminPageContext } from '../../lib/admin-i18n';
import {
  getSearchParam,
  resolveRouteSearchParams,
} from '../../lib/admin-routing';
import {
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getCityDetailSnapshot,
} from '../../lib/backoffice';
import { cityPrimaryName } from '../../lib/backoffice-view';

type CityDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function CityDetailPage({
  params,
  searchParams,
}: CityDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const [snapshot, city, activity, notes] = await Promise.all([
    getBackofficeSnapshot(),
    getCityDetailSnapshot(resolvedParams.id),
    getAdminActivitySnapshot({
      entityType: 'city',
      entityId: resolvedParams.id,
      limit: 6,
    }),
    getAdminNotesSnapshot({
      entityType: 'city',
      entityId: resolvedParams.id,
      limit: 6,
    }),
  ]);
  const backHref = `/cities?lang=${locale}`;
  const relatedTariffs = city
    ? snapshot.tariffs.filter((tariff) => tariff.cityId === city.id)
    : [];
  const relatedOrders = city
    ? snapshot.orders.filter((order) => order.cityId === city.id)
    : [];
  const activeOrders = relatedOrders.filter((order) =>
    ['searching', 'accepted', 'arriving', 'waiting', 'in_progress'].includes(
      order.status,
    ),
  ).length;
  const activeTariffs = relatedTariffs.filter((tariff) => tariff.isActive).length;
  const cityTitle = city ? cityPrimaryName(city, locale) : resolvedParams.id;

  return (
    <AppFrame
      current="cities"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.cityDetailPage.eyebrow}
          title={
            city
              ? dictionary.cityDetailPage.title(cityTitle)
              : dictionary.cityDetailPage.notFoundTitle
          }
          description={
            city
              ? dictionary.cityDetailPage.description
              : dictionary.cityDetailPage.notFoundDescription
          }
          aside={
            <Link href={backHref} className="action-button action-button--ghost">
              {dictionary.cityDetailPage.backToCities}
            </Link>
          }
        >
          {city ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.reportsPage.totalOrdersLabel}
                value={String(relatedOrders.length)}
                hint={dictionary.cityDetailPage.ordersDescription}
                accent="gold"
              />
              <MetricCard
                label={dictionary.ordersPage.liveOrdersLabel}
                value={String(activeOrders)}
                hint={dictionary.ordersPage.liveOrdersHint(activeOrders)}
                accent="teal"
              />
              <MetricCard
                label={dictionary.tariffsPage.totalTariffsLabel}
                value={String(relatedTariffs.length)}
                hint={dictionary.tariffsPage.totalTariffsHint}
                accent="ink"
              />
              <MetricCard
                label={dictionary.citiesPage.activeLabel}
                value={
                  city.isActive
                    ? dictionary.forms.activeBadge
                    : dictionary.forms.inactiveBadge
                }
                hint={dictionary.citiesPage.activeHint}
                accent="ember"
              />
            </section>
          ) : (
            <p className="empty-state">{dictionary.cityDetailPage.notFoundDescription}</p>
          )}
        </SectionShell>

        {city ? (
          <>
            <SectionShell
              eyebrow={dictionary.cityDetailPage.eyebrow}
              title={dictionary.cityDetailPage.summaryTitle}
              description={dictionary.cityDetailPage.summaryDescription}
            >
              <article className="detail-card">
                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.table.id}</dt>
                    <dd>{city.id}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.nameRu}</dt>
                    <dd>{city.nameRu}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.nameKk}</dt>
                    <dd>{city.nameKk}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.countryCode}</dt>
                    <dd>{city.countryCode}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.currency}</dt>
                    <dd>{city.currency}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.timezone}</dt>
                    <dd>{city.timezone}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.isActive}</dt>
                    <dd>
                      {city.isActive
                        ? dictionary.forms.activeBadge
                        : dictionary.forms.inactiveBadge}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.tariffsPage.activeVersionsLabel}</dt>
                    <dd>{String(activeTariffs)}</dd>
                  </div>
                </dl>
              </article>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.cityDetailPage.eyebrow}
              title={dictionary.cityDetailPage.editTitle}
              description={dictionary.cityDetailPage.editDescription}
            >
              <form action={updateCityAction} className="admin-form">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={`/cities/${city.id}?lang=${locale}`}
                />
                <input type="hidden" name="cityId" value={city.id} />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.nameRu}</span>
                    <input name="nameRu" defaultValue={city.nameRu} required />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.nameKk}</span>
                    <input name="nameKk" defaultValue={city.nameKk} required />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.countryCode}</span>
                    <input
                      name="countryCode"
                      defaultValue={city.countryCode}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.currency}</span>
                    <select name="currency" defaultValue={city.currency}>
                      <option value="KZT">{dictionary.forms.currencyKzt}</option>
                      <option value="RUB">{dictionary.forms.currencyRub}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.timezone}</span>
                    <input name="timezone" defaultValue={city.timezone} required />
                  </label>
                  <label className="field field--checkbox">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked={city.isActive}
                    />
                    <span>{dictionary.forms.isActive}</span>
                  </label>
                </div>
                <div className="button-row">
                  <button type="submit" className="action-button">
                    {dictionary.forms.save}
                  </button>
                </div>
              </form>
            </SectionShell>

            <InternalActivityPanel
              activity={activity}
              entityType="city"
              entityId={city.id}
              locale={locale}
              dictionary={dictionary}
            />

            <InternalNotesPanel
              notes={notes}
              entityType="city"
              entityId={city.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={`/cities/${city.id}?lang=${locale}`}
            />

            <SectionShell
              eyebrow={dictionary.cityDetailPage.eyebrow}
              title={dictionary.cityDetailPage.tariffsTitle}
              description={dictionary.cityDetailPage.tariffsDescription}
            >
              <div className="button-row"><a className="action-button" href={`/tariffs/new?cityId=${city.id}&lang=${locale}`}>{getCreationLabels(locale).newTariff}</a><a className="action-button action-button--soft" href={`/orders/new?cityId=${city.id}&lang=${locale}`}>{getCreationLabels(locale).newOrder}</a></div>
              <TariffsPanel
                tariffs={relatedTariffs}
                showActions
                returnPath={`/cities/${city.id}?lang=${locale}`}
                locale={locale}
                dictionary={dictionary}
              />
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.cityDetailPage.eyebrow}
              title={dictionary.cityDetailPage.ordersTitle}
              description={dictionary.cityDetailPage.ordersDescription}
            >
              <OrdersTable
                orders={relatedOrders}
                locale={locale}
                dictionary={dictionary}
                emptyMessage={dictionary.cityDetailPage.emptyOrders}
              />
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
