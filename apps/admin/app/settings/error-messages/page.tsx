import { AppFrame } from "../../components/app-frame";
import { FlashBanner } from "../../components/flash-banner";
import { SectionShell } from "../../components/section-shell";
import { adminApiRequest } from "../../lib/admin-api";
import { updateErrorMessageAction } from "../../lib/admin-actions";
import { getAdminPageContext } from "../../lib/admin-i18n";
import {
  getSearchParam,
  resolveRouteSearchParams,
} from "../../lib/admin-routing";
import { getBackofficeSnapshot } from "../../lib/backoffice";

type Catalog = {
  version: string;
  messages: { ru: Record<string, string>; kk: Record<string, string> };
};
type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
export default async function ErrorMessagesPage({ searchParams }: Props) {
  const params = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(params);
  const query = (getSearchParam(params, "q") ?? "").trim().toLowerCase();
  const snapshot = await getBackofficeSnapshot();
  let catalog: Catalog | undefined;
  let loadError: string | undefined;
  try {
    catalog = await adminApiRequest<Catalog>("admin/error-messages", {
      cache: "no-store",
    });
  } catch {
    loadError = dictionary.feedback.actionFailed("API");
  }
  const codes = Object.keys(catalog?.messages.ru ?? {})
    .sort()
    .filter(
      (code) =>
        !query ||
        `${code} ${catalog?.messages.ru[code]} ${catalog?.messages.kk[code]}`
          .toLowerCase()
          .includes(query),
    );
  return (
    <AppFrame
      current="settings"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner
          notice={getSearchParam(params, "notice")}
          error={loadError ?? getSearchParam(params, "error")}
        />
        <SectionShell
          eyebrow={dictionary.settingsPage.title}
          title={dictionary.settingsPage.errorMessagesTitle}
          description={dictionary.settingsPage.errorMessagesDescription}
        >
          <form className="admin-form" method="get">
            <input type="hidden" name="lang" value={locale} />
            <label className="field">
              <span>{dictionary.settingsPage.errorMessagesSearch}</span>
              <input name="q" defaultValue={getSearchParam(params, "q")} />
            </label>
            <button className="action-button" type="submit">
              {dictionary.settingsPage.errorMessagesSearch}
            </button>
          </form>
          {codes.map((code) => (
            <form
              key={code}
              action={updateErrorMessageAction}
              className="admin-form"
            >
              <h3>{code}</h3>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="locale" value={locale} />
              <div className="admin-form__grid">
                <label className="field">
                  <span>{dictionary.settingsPage.errorMessagesRussian}</span>
                  <textarea
                    name="ru"
                    required
                    maxLength={1000}
                    rows={3}
                    defaultValue={catalog?.messages.ru[code]}
                  />
                </label>
                <label className="field">
                  <span>{dictionary.settingsPage.errorMessagesKazakh}</span>
                  <textarea
                    name="kk"
                    required
                    maxLength={1000}
                    rows={3}
                    defaultValue={catalog?.messages.kk[code]}
                  />
                </label>
              </div>
              <button className="action-button" type="submit">
                {dictionary.forms.save}
              </button>
            </form>
          ))}
        </SectionShell>
      </main>
    </AppFrame>
  );
}
