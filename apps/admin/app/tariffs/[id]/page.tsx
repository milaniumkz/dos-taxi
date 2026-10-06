import Link from "next/link";

import { AppFrame } from "../../components/app-frame";
import { CitiesPanel } from "../../components/cities-panel";
import { FlashBanner } from "../../components/flash-banner";
import { InternalActivityPanel } from "../../components/internal-activity-panel";
import { InternalNotesPanel } from "../../components/internal-notes-panel";
import { MetricCard } from "../../components/metric-card";
import { OrdersTable } from "../../components/orders-table";
import { SectionShell } from "../../components/section-shell";
import { updateTariffAction } from "../../lib/admin-actions";
import {
  getAdminPageContext,
  translateServiceType,
} from "../../lib/admin-i18n";
import {
  getSearchParam,
  resolveRouteSearchParams,
} from "../../lib/admin-routing";
import {
  getAdminActivitySnapshot,
  getAdminNotesSnapshot,
  getBackofficeSnapshot,
  getTariffDetailSnapshot,
} from "../../lib/backoffice";
import {
  formatDate,
  formatDateNullable,
  formatMoney,
  tariffPrimaryName,
} from "../../lib/backoffice-view";

type TariffDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

function toDateTimeLocalValue(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

export default async function TariffDetailPage({
  params,
  searchParams,
}: TariffDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const [snapshot, tariff, activity, notes] = await Promise.all([
    getBackofficeSnapshot(),
    getTariffDetailSnapshot(resolvedParams.id),
    getAdminActivitySnapshot({
      entityType: "tariff",
      entityId: resolvedParams.id,
      limit: 6,
    }),
    getAdminNotesSnapshot({
      entityType: "tariff",
      entityId: resolvedParams.id,
      limit: 6,
    }),
  ]);
  const city = tariff
    ? (snapshot.cities.find((entry) => entry.id === tariff.cityId) ?? null)
    : null;
  const relatedOrders = tariff
    ? snapshot.orders.filter(
        (order) =>
          order.cityId === tariff.cityId &&
          order.serviceType === tariff.serviceType,
      )
    : [];
  const activeOrders = relatedOrders.filter((order) =>
    ["searching", "accepted", "arriving", "waiting", "in_progress"].includes(
      order.status,
    ),
  ).length;
  const backHref = `/tariffs?lang=${locale}`;
  const tariffTitle = tariff
    ? tariffPrimaryName(tariff, locale)
    : resolvedParams.id;

  return (
    <AppFrame
      current="tariffs"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.tariffDetailPage.eyebrow}
          title={
            tariff
              ? dictionary.tariffDetailPage.title(tariffTitle)
              : dictionary.tariffDetailPage.notFoundTitle
          }
          description={
            tariff
              ? dictionary.tariffDetailPage.description
              : dictionary.tariffDetailPage.notFoundDescription
          }
          aside={
            <Link
              href={backHref}
              className="action-button action-button--ghost"
            >
              {dictionary.tariffDetailPage.backToTariffs}
            </Link>
          }
        >
          {tariff ? (
            <section className="metrics-grid">
              <MetricCard
                label={dictionary.tariffsPanel.base}
                value={formatMoney(tariff.basePrice, tariff.currency, locale)}
                hint={dictionary.forms.currency}
                accent="gold"
              />
              <MetricCard
                label={dictionary.tariffsPanel.minimum}
                value={formatMoney(
                  tariff.minimumPrice,
                  tariff.currency,
                  locale,
                )}
                hint={dictionary.tariffsPage.activeVersionsHint}
                accent="teal"
              />
              <MetricCard
                label={dictionary.reportsPage.totalOrdersLabel}
                value={String(relatedOrders.length)}
                hint={dictionary.tariffDetailPage.ordersDescription}
                accent="ink"
              />
              <MetricCard
                label={dictionary.forms.commissionPercent}
                value={`${tariff.commissionPercent}%`}
                hint={formatMoney(
                  tariff.commissionFixed,
                  tariff.currency,
                  locale,
                )}
                accent="ember"
              />
            </section>
          ) : (
            <p className="empty-state">
              {dictionary.tariffDetailPage.notFoundDescription}
            </p>
          )}
        </SectionShell>

        {tariff ? (
          <>
            <SectionShell
              eyebrow={dictionary.tariffDetailPage.eyebrow}
              title={dictionary.tariffDetailPage.summaryTitle}
              description={dictionary.tariffDetailPage.summaryDescription}
            >
              <article className="detail-card">
                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.table.id}</dt>
                    <dd>{tariff.id}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.serviceType}</dt>
                    <dd>
                      {translateServiceType(tariff.serviceType, dictionary)}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.vehicleClass}</dt>
                    <dd>{tariff.vehicleClass || "—"}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.currency}</dt>
                    <dd>{tariff.currency}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.validFrom}</dt>
                    <dd>{formatDate(tariff.validFrom, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.validTo}</dt>
                    <dd>{formatDateNullable(tariff.validTo, locale)}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.isActive}</dt>
                    <dd>
                      {tariff.isActive
                        ? dictionary.forms.activeBadge
                        : dictionary.forms.inactiveBadge}
                    </dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.freeWaitingSeconds}</dt>
                    <dd>{tariff.freeWaitingSeconds}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.paidWaitingPerMinute}</dt>
                    <dd>{tariff.paidWaitingPerMinute}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.commissionPercent}</dt>
                    <dd>{tariff.commissionPercent}%</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.commissionFixed}</dt>
                    <dd>
                      {formatMoney(
                        tariff.commissionFixed,
                        tariff.currency,
                        locale,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.tariffDetailPage.eyebrow}
              title={dictionary.tariffDetailPage.editTitle}
              description={dictionary.tariffDetailPage.editDescription}
            >
              <form action={updateTariffAction} className="admin-form">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="returnPath"
                  value={`/tariffs/${tariff.id}?lang=${locale}`}
                />
                <input type="hidden" name="tariffId" value={tariff.id} />
                <input
                  type="hidden"
                  name="originalCityId"
                  value={tariff.cityId}
                />
                <input
                  type="hidden"
                  name="originalServiceType"
                  value={tariff.serviceType}
                />
                <input
                  type="hidden"
                  name="originalVehicleClass"
                  value={tariff.vehicleClass ?? ""}
                />
                <input
                  type="hidden"
                  name="originalNameRu"
                  value={tariff.nameRu}
                />
                <input
                  type="hidden"
                  name="originalNameKk"
                  value={tariff.nameKk}
                />
                <input
                  type="hidden"
                  name="originalBasePrice"
                  value={tariff.basePrice}
                />
                <input
                  type="hidden"
                  name="originalPricePerKm"
                  value={tariff.pricePerKm}
                />
                <input
                  type="hidden"
                  name="originalPricePerMinute"
                  value={tariff.pricePerMinute}
                />
                <input
                  type="hidden"
                  name="originalMinimumPrice"
                  value={tariff.minimumPrice}
                />
                <input
                  type="hidden"
                  name="originalFreeWaitingSeconds"
                  value={String(tariff.freeWaitingSeconds)}
                />
                <input
                  type="hidden"
                  name="originalPaidWaitingPerMinute"
                  value={tariff.paidWaitingPerMinute}
                />
                <input
                  type="hidden"
                  name="originalCommissionPercent"
                  value={tariff.commissionPercent}
                />
                <input
                  type="hidden"
                  name="originalCommissionFixed"
                  value={tariff.commissionFixed}
                />
                <input
                  type="hidden"
                  name="originalCurrency"
                  value={tariff.currency}
                />
                <input
                  type="hidden"
                  name="originalValidFrom"
                  value={toDateTimeLocalValue(tariff.validFrom)}
                />
                <input
                  type="hidden"
                  name="originalValidTo"
                  value={toDateTimeLocalValue(tariff.validTo)}
                />
                <input
                  type="hidden"
                  name="originalIsActive"
                  value={tariff.isActive ? "true" : "false"}
                />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.city}</span>
                    <input value={city?.nameRu ?? tariff.cityId} readOnly />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.serviceType}</span>
                    <input
                      value={translateServiceType(
                        tariff.serviceType,
                        dictionary,
                      )}
                      readOnly
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.vehicleClass}</span>
                    <input
                      value={tariff.vehicleClass ?? "Единый тариф"}
                      readOnly
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.nameRu}</span>
                    <input value={tariff.nameRu} readOnly />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.nameKk}</span>
                    <input value={tariff.nameKk} readOnly />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.basePrice}</span>
                    <input
                      name="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={tariff.basePrice}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.pricePerKm}</span>
                    <input
                      name="pricePerKm"
                      type="number"
                      min="0"
                      step="0.0001"
                      defaultValue={tariff.pricePerKm}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.pricePerMinute}</span>
                    <input
                      name="pricePerMinute"
                      type="number"
                      min="0"
                      step="0.0001"
                      defaultValue={tariff.pricePerMinute}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.minimumPrice}</span>
                    <input
                      name="minimumPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={tariff.minimumPrice}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.freeWaitingSeconds}</span>
                    <input
                      name="freeWaitingSeconds"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={String(tariff.freeWaitingSeconds)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.paidWaitingPerMinute}</span>
                    <input
                      name="paidWaitingPerMinute"
                      type="number"
                      min="0"
                      step="0.0001"
                      defaultValue={tariff.paidWaitingPerMinute}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.commissionPercent}</span>
                    <input
                      name="commissionPercent"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={tariff.commissionPercent}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.commissionFixed}</span>
                    <input
                      name="commissionFixed"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={tariff.commissionFixed}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.currency}</span>
                    <select name="currency" defaultValue={tariff.currency}>
                      <option value="KZT">KZT</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.validFrom}</span>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(tariff.validFrom)}
                      readOnly
                    />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.validTo}</span>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(tariff.validTo)}
                      readOnly
                    />
                  </label>
                  <label className="field field--checkbox">
                    <input
                      type="checkbox"
                      defaultChecked={tariff.isActive}
                      disabled
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
              entityType="tariff"
              entityId={tariff.id}
              locale={locale}
              dictionary={dictionary}
            />

            <InternalNotesPanel
              notes={notes}
              entityType="tariff"
              entityId={tariff.id}
              locale={locale}
              dictionary={dictionary}
              returnPath={`/tariffs/${tariff.id}?lang=${locale}`}
            />

            <SectionShell
              eyebrow={dictionary.tariffDetailPage.eyebrow}
              title={dictionary.tariffDetailPage.cityTitle}
              description={dictionary.tariffDetailPage.cityDescription}
            >
              {city ? (
                <CitiesPanel
                  cities={[city]}
                  locale={locale}
                  dictionary={dictionary}
                />
              ) : (
                <p className="empty-state">
                  {dictionary.cityDetailPage.notFoundDescription}
                </p>
              )}
            </SectionShell>

            <SectionShell
              eyebrow={dictionary.tariffDetailPage.eyebrow}
              title={dictionary.tariffDetailPage.ordersTitle}
              description={dictionary.tariffDetailPage.ordersDescription}
            >
              <OrdersTable
                orders={relatedOrders}
                locale={locale}
                dictionary={dictionary}
                emptyMessage={dictionary.tariffDetailPage.emptyOrders}
              />
            </SectionShell>
          </>
        ) : null}
      </main>
    </AppFrame>
  );
}
