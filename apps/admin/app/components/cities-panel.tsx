import Link from 'next/link';

import { CitySnapshot } from '../lib/backoffice';
import { AdminDictionary, AdminLocale } from '../lib/admin-i18n';
import { toggleCityActiveAction } from '../lib/admin-actions';
import { cityPrimaryName, citySecondaryName } from '../lib/backoffice-view';
import { StatusPill } from './status-pill';

type CitiesPanelProps = {
  cities: CitySnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  returnPath?: string;
  showActions?: boolean;
  linkToDetails?: boolean;
};

export function CitiesPanel({
  cities,
  locale,
  dictionary,
  returnPath,
  showActions = false,
  linkToDetails = true,
}: CitiesPanelProps) {
  if (cities.length === 0) {
    return <p className="empty-state">{dictionary.citiesPanel.empty}</p>;
  }

  return (
    <div className="city-grid">
      {cities.map((city) => (
        <article key={city.id} className="city-card">
          <div className="city-card__top">
            <h3>
              {linkToDetails ? (
                <Link href={`/cities/${city.id}?lang=${locale}`} className="table-link">
                  {cityPrimaryName(city, locale)}
                </Link>
              ) : (
                cityPrimaryName(city, locale)
              )}
            </h3>
            <StatusPill tone={city.isActive ? 'success' : 'neutral'}>
              {city.isActive
                ? dictionary.citiesPanel.live
                : dictionary.citiesPanel.standby}
            </StatusPill>
          </div>
          <p>{citySecondaryName(city, locale)}</p>
          <dl>
            <div>
              <dt>{dictionary.citiesPanel.currency}</dt>
              <dd>{city.currency}</dd>
            </div>
            <div>
              <dt>{dictionary.citiesPanel.timezone}</dt>
              <dd>{city.timezone}</dd>
            </div>
            <div>
              <dt>{dictionary.citiesPanel.country}</dt>
              <dd>{city.countryCode}</dd>
            </div>
          </dl>
          {showActions && returnPath ? (
            <form action={toggleCityActiveAction} className="inline-form">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <input type="hidden" name="cityId" value={city.id} />
              <input
                type="hidden"
                name="isActive"
                value={city.isActive ? 'false' : 'true'}
              />
              <button type="submit" className="action-button action-button--soft">
                {city.isActive
                  ? dictionary.forms.deactivate
                  : dictionary.forms.activate}
              </button>
            </form>
          ) : null}
        </article>
      ))}
    </div>
  );
}
