import { AppFrame } from '../components/app-frame';
import { FlashBanner } from '../components/flash-banner';
import { MetricCard } from '../components/metric-card';
import { SectionShell } from '../components/section-shell';
import { UsersPanel } from '../components/users-panel';
import { getAdminPageContext } from '../lib/admin-i18n';
import {
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from '../lib/admin-routing';
import {
  getBackofficeSnapshot,
  getUsersSnapshot,
} from '../lib/backoffice';

type UsersPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    query?: string | string[];
    blockedState?: string | string[];
    preferredLanguage?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(resolvedSearchParams);
  const searchQuery = getSearchParam(resolvedSearchParams, 'query') ?? '';
  const blockedState = getSearchParam(resolvedSearchParams, 'blockedState') ?? 'all';
  const preferredLanguage =
    getSearchParam(resolvedSearchParams, 'preferredLanguage') ?? '';
  const notice = getSearchParam(resolvedSearchParams, 'notice');
  const error = getSearchParam(resolvedSearchParams, 'error');
  const returnPath = buildReturnPath('/users', resolvedSearchParams, locale);
  const [users, filteredUsers] = await Promise.all([
    getUsersSnapshot({ limit: 100 }),
    getUsersSnapshot({
      query: searchQuery || undefined,
      preferredLanguage:
        preferredLanguage === 'ru' || preferredLanguage === 'kk'
          ? preferredLanguage
          : undefined,
      isBlocked:
        blockedState === 'blocked'
          ? true
          : blockedState === 'unblocked'
            ? false
            : undefined,
      limit: 100,
    }),
  ]);

  const blockedUsers = users.filter((user) => user.isBlocked).length;
  const ruUsers = users.filter((user) => user.preferredLanguage === 'ru').length;
  const kkUsers = users.filter((user) => user.preferredLanguage === 'kk').length;

  return (
    <AppFrame
      current="users"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={dictionary.usersPage.totalUsersLabel}
            value={String(users.length)}
            hint={dictionary.usersPage.totalUsersHint}
            accent="gold"
          />
          <MetricCard
            label={dictionary.usersPage.blockedLabel}
            value={String(blockedUsers)}
            hint={dictionary.usersPage.blockedHint}
            accent="ember"
          />
          <MetricCard
            label={dictionary.usersPage.ruLabel}
            value={String(ruUsers)}
            hint={dictionary.usersPage.ruHint}
            accent="ink"
          />
          <MetricCard
            label={dictionary.usersPage.kkLabel}
            value={String(kkUsers)}
            hint={dictionary.usersPage.kkHint}
            accent="teal"
          />
        </section>

        <SectionShell
          eyebrow={dictionary.usersPage.eyebrow}
          title={dictionary.usersPage.filtersTitle}
          description={dictionary.usersPage.filtersDescription}
        >
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.search}</span>
                <input name="query" defaultValue={searchQuery} />
              </label>
              <label className="field">
                <span>{dictionary.forms.blockedState}</span>
                <select name="blockedState" defaultValue={blockedState}>
                  <option value="all">{dictionary.forms.allStates}</option>
                  <option value="blocked">{dictionary.forms.blockedOnly}</option>
                  <option value="unblocked">
                    {dictionary.forms.unblockedOnly}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{dictionary.forms.language}</span>
                <select name="preferredLanguage" defaultValue={preferredLanguage}>
                  <option value="">{dictionary.forms.allStates}</option>
                  <option value="ru">{dictionary.shell.languageRu}</option>
                  <option value="kk">{dictionary.shell.languageKk}</option>
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <a href={`/users?lang=${locale}`} className="action-button action-button--ghost">
                {dictionary.forms.clear}
              </a>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.usersPage.eyebrow}
          title={dictionary.usersPage.title}
          description={dictionary.usersPage.description}
        >
          <UsersPanel
            users={filteredUsers}
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
