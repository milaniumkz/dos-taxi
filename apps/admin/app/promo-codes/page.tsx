import { AppFrame } from '../components/app-frame';
import { FlashBanner } from '../components/flash-banner';
import { SectionShell } from '../components/section-shell';
import { StatusPill } from '../components/status-pill';
import {
  createPromoCodeAction,
  togglePromoCodeActiveAction,
} from '../lib/admin-actions';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import {
  getBackofficeSnapshot,
  getPromoCodesSnapshot,
} from '../lib/backoffice';
import { formatDate } from '../lib/backoffice-view';
import Link from 'next/link';

type PromoCodesPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    query?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function PromoCodesPage({
  searchParams,
}: PromoCodesPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const promoCodes = await getPromoCodesSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const selectedQuery = getSearchParam(resolvedSearchParams, 'query') ?? '';
  const returnPath = buildReturnPath(
    '/promo-codes',
    resolvedSearchParams,
    locale,
  );
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const filteredPromoCodes = promoCodes.filter((promoCode) => {
    if (!selectedQuery) {
      return true;
    }

    const normalizedQuery = selectedQuery.trim().toLowerCase();
    const haystack = [
      promoCode.id,
      promoCode.code,
      promoCode.discountType,
      promoCode.discountValue,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return (
    <AppFrame
      current="promoCodes"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <SectionShell
          eyebrow={dictionary.promoCodesPage.listEyebrow}
          title={dictionary.promoCodesPage.filtersTitle}
          description={dictionary.promoCodesPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.search}</span>
                <input name="query" defaultValue={selectedQuery} />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a
                href={`/promo-codes?lang=${locale}`}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.promoCodesPage.createEyebrow}
          title={dictionary.promoCodesPage.createTitle}
          description={dictionary.promoCodesPage.createDescription}
        >
          <form action={createPromoCodeAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.code}</span>
                <input name="code" required />
              </label>
              <label className="field">
                <span>{dictionary.forms.discountType}</span>
                <select name="discountType" defaultValue="fixed">
                  <option value="fixed">{dictionary.forms.fixed}</option>
                  <option value="percent">{dictionary.forms.percent}</option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.discountValue}</span>
                <input
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </label>
              <label className="field">
                <span>{dictionary.forms.maxUses}</span>
                <input name="maxUses" type="number" min="1" step="1" />
              </label>
              <label className="field">
                <span>{dictionary.forms.validTo}</span>
                <input name="validTo" type="datetime-local" />
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

        <SectionShell
          eyebrow={dictionary.promoCodesPage.listEyebrow}
          title={dictionary.promoCodesPage.listTitle}
          description={dictionary.promoCodesPage.listDescription}
        >
          <div className="promo-grid">
            {filteredPromoCodes.map((promoCode) => (
              <article key={promoCode.id} className="promo-card">
                <div className="promo-card__top">
                  <div>
                    <h3>
                      <Link
                        href={`/promo-codes/${promoCode.id}?lang=${locale}`}
                        className="table-link"
                      >
                        {promoCode.code}
                      </Link>
                    </h3>
                    <p>
                      {(promoCode.discountType === 'percent'
                        ? dictionary.forms.percent
                        : dictionary.forms.fixed)}{' '}
                      / {promoCode.discountValue}
                    </p>
                  </div>
                  <StatusPill tone={promoCode.isActive ? 'success' : 'neutral'}>
                    {promoCode.isActive
                      ? dictionary.forms.activeBadge
                      : dictionary.forms.inactiveBadge}
                  </StatusPill>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>{dictionary.forms.maxUses}</dt>
                    <dd>{promoCode.maxUses ?? dictionary.forms.noLimit}</dd>
                  </div>
                  <div>
                    <dt>{dictionary.forms.validTo}</dt>
                    <dd>
                      {promoCode.validTo
                        ? formatDate(promoCode.validTo, locale)
                        : '-'}
                    </dd>
                  </div>
                </dl>
                <form action={togglePromoCodeActiveAction} className="inline-form">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="promoCodeId" value={promoCode.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={promoCode.isActive ? 'false' : 'true'}
                  />
                  <button type="submit" className="action-button action-button--soft">
                    {promoCode.isActive
                      ? dictionary.forms.deactivate
                      : dictionary.forms.activate}
                  </button>
                </form>
              </article>
            ))}
          </div>
        </SectionShell>
      </main>
    </AppFrame>
  );
}
