import { randomUUID } from "node:crypto";
import { AppFrame } from "./app-frame";
import { SectionShell } from "./section-shell";
import { OrderCreationForm, TariffCreationForm } from "./creation-forms";
import { getBackofficeSnapshot } from "../lib/backoffice";
import { getAdminPageContext } from "../lib/admin-i18n";
import { getCreationLabels } from "../lib/creation-i18n";
import {
  getSearchParam,
  resolveRouteSearchParams,
  type AsyncRouteSearchParams,
} from "../lib/admin-routing";
import { resolveAdminRuntimeConfig } from "../lib/admin-env";

export async function CreationPage({
  kind,
  searchParams,
}: {
  kind: "tariffs" | "orders";
  searchParams?: AsyncRouteSearchParams;
}) {
  const snapshot = await getBackofficeSnapshot();
  const params = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(params);
  const labels = getCreationLabels(locale);
  const active = snapshot.cities.filter((c) => c.isActive);
  const requested = getSearchParam(params, "cityId");
  const initialCityId =
    active.find((c) => c.id === requested)?.id ??
    (active.length === 1 ? active[0].id : "");
  const props = {
    cities: snapshot.cities,
    tariffs: snapshot.tariffs,
    labels,
    locale,
    initialCityId,
    canSave: resolveAdminRuntimeConfig().warnings.length === 0,
    requestKey: randomUUID(),
  };
  return (
    <AppFrame current={kind} {...{ snapshot, locale, dictionary }}>
      <main className="admin-shell">
        <a
          href={`/${kind}?lang=${locale}`}
          className="action-button action-button--ghost"
        >
          {labels.back}
        </a>
        <SectionShell
          eyebrow={labels.city}
          title={kind === "tariffs" ? labels.newTariff : labels.newOrder}
          description={
            kind === "tariffs" ? labels.tariffIntro : labels.orderIntro
          }
        >
          {!active.length ? (
            <p>{labels.noCities}</p>
          ) : kind === "tariffs" ? (
            <TariffCreationForm {...props} />
          ) : (
            <OrderCreationForm {...props} />
          )}
        </SectionShell>
      </main>
    </AppFrame>
  );
}
