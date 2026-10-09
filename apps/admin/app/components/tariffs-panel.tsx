import Link from "next/link";
import { DeleteTariffButton } from "./delete-tariff-button";

import { TariffSnapshot } from "../lib/backoffice";
import {
  AdminDictionary,
  AdminLocale,
  translateServiceType,
} from "../lib/admin-i18n";
import { toggleTariffActiveAction } from "../lib/admin-actions";
import { formatMoney, tariffPrimaryName } from "../lib/backoffice-view";
import { StatusPill } from "./status-pill";

type TariffsPanelProps = {
  tariffs: TariffSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  returnPath?: string;
  showActions?: boolean;
  linkToDetails?: boolean;
};

function tariffSubtitle(
  tariff: TariffSnapshot,
  dictionary: AdminDictionary,
): string {
  const serviceType = translateServiceType(tariff.serviceType, dictionary);
  return tariff.vehicleClass
    ? `${serviceType} / ${tariff.vehicleClass}`
    : serviceType;
}

export function TariffsPanel({
  tariffs,
  locale,
  dictionary,
  returnPath,
  showActions = false,
  linkToDetails = true,
}: TariffsPanelProps) {
  if (tariffs.length === 0) {
    return <p className="empty-state">{dictionary.tariffsPanel.empty}</p>;
  }

  return (
    <div className="tariff-stack">
      {tariffs.map((tariff) => (
        <article key={tariff.id} className="tariff-card">
          <div className="tariff-card__header">
            <div>
              <h3>
                {linkToDetails ? (
                  <Link
                    href={`/tariffs/${tariff.id}?lang=${locale}`}
                    className="table-link"
                  >
                    {tariffPrimaryName(tariff, locale)}
                  </Link>
                ) : (
                  tariffPrimaryName(tariff, locale)
                )}
              </h3>
              <p>{tariffSubtitle(tariff, dictionary)}</p>
            </div>
            <StatusPill tone={tariff.isActive ? "success" : "neutral"}>
              {tariff.isActive
                ? dictionary.tariffsPanel.active
                : dictionary.tariffsPanel.archived}
            </StatusPill>
          </div>
          <dl>
            <div>
              <dt>{dictionary.tariffsPanel.base}</dt>
              <dd>{formatMoney(tariff.basePrice, tariff.currency, locale)}</dd>
            </div>
            <div>
              <dt>{dictionary.tariffsPanel.perKm}</dt>
              <dd>{formatMoney(tariff.pricePerKm, tariff.currency, locale)}</dd>
            </div>
            <div>
              <dt>{dictionary.tariffsPanel.perMinute}</dt>
              <dd>
                {formatMoney(tariff.pricePerMinute, tariff.currency, locale)}
              </dd>
            </div>
            <div>
              <dt>{dictionary.tariffsPanel.minimum}</dt>
              <dd>
                {formatMoney(tariff.minimumPrice, tariff.currency, locale)}
              </dd>
            </div>
            <div>
              <dt>{dictionary.forms.commissionPercent}</dt>
              <dd>{tariff.commissionPercent}%</dd>
            </div>
            <div>
              <dt>{dictionary.forms.commissionFixed}</dt>
              <dd>
                {formatMoney(tariff.commissionFixed, tariff.currency, locale)}
              </dd>
            </div>
          </dl>
          {showActions && returnPath ? (
            <DeleteTariffButton
              tariff={tariff}
              locale={locale}
              returnPath={returnPath}
            />
          ) : null}
          {showActions && returnPath ? (
            <form action={toggleTariffActiveAction} className="inline-form">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <input type="hidden" name="tariffId" value={tariff.id} />
              <input
                type="hidden"
                name="isActive"
                value={tariff.isActive ? "false" : "true"}
              />
              <button
                type="submit"
                className="action-button action-button--soft"
              >
                {tariff.isActive
                  ? dictionary.forms.archive
                  : dictionary.forms.activate}
              </button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}
