import Link from "next/link";
import { AppFrame } from "../components/app-frame";
import { FlashBanner } from "../components/flash-banner";
import { SectionShell } from "../components/section-shell";
import {
  updateDispatchSettingsAction,
  updateDriverBonusSettingsAction,
} from "../lib/admin-actions";
import { getAdminPageContext } from "../lib/admin-i18n";
import { getSearchParam, resolveRouteSearchParams } from "../lib/admin-routing";
import {
  getBackofficeSnapshot,
  getDispatchSettingsSnapshot,
  getDriverBonusSettingsSnapshot,
} from "../lib/backoffice";

type SettingsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const [snapshot, dispatchSettings, driverBonusSettings] = await Promise.all([
    getBackofficeSnapshot(),
    getDispatchSettingsSnapshot(),
    getDriverBonusSettingsSnapshot(),
  ]);
  const returnPath = `/settings?lang=${locale}`;

  return (
    <AppFrame
      current="settings"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="admin-hero">
          <div className="admin-hero__copy">
            <span className="eyebrow">
              {dictionary.settingsPage.dispatchEyebrow}
            </span>
            <h1>{dictionary.settingsPage.title}</h1>
            <p>{dictionary.settingsPage.description}</p>
          </div>
        </section>

        <Link className="action-button" href={`/settings/error-messages?lang=${locale}`}>{dictionary.settingsPage.errorMessagesTitle}</Link>

        <SectionShell
          eyebrow={dictionary.settingsPage.dispatchEyebrow}
          title={dictionary.settingsPage.dispatchTitle}
          description={dictionary.settingsPage.dispatchDescription}
        >
          <form action={updateDispatchSettingsAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.settingsPage.maxRadiusKm}</span>
                <input
                  name="maxRadiusKm"
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.5"
                  defaultValue={dispatchSettings.maxRadiusKm}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.distanceWeight}</span>
                <input
                  name="distanceWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue={dispatchSettings.distanceWeight}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.ratingWeight}</span>
                <input
                  name="ratingWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue={dispatchSettings.ratingWeight}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.activityWeight}</span>
                <input
                  name="activityWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue={dispatchSettings.activityWeight}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.priorityWeight}</span>
                <input
                  name="priorityWeight"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue={dispatchSettings.priorityWeight}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.maxCandidates}</span>
                <input
                  name="maxCandidates"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  defaultValue={dispatchSettings.maxCandidates}
                />
              </label>
            </div>
            <p className="empty-state">
              {dictionary.settingsPage.maxRadiusHint}
            </p>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.save}
              </button>
            </div>
          </form>
        </SectionShell>

        <SectionShell
          eyebrow={dictionary.settingsPage.bonusEyebrow}
          title={dictionary.settingsPage.bonusTitle}
          description={dictionary.settingsPage.bonusDescription}
        >
          <form
            action={updateDriverBonusSettingsAction}
            className="admin-form"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <label className="field field--checkbox">
              <input
                name="isEnabled"
                type="checkbox"
                defaultChecked={driverBonusSettings.isEnabled}
              />
              <span>{dictionary.settingsPage.bonusEnabled}</span>
            </label>
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.settingsPage.bonusOrdersRequired}</span>
                <input
                  name="ordersRequired"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  defaultValue={driverBonusSettings.ordersRequired}
                />
              </label>
              <label className="field">
                <span>{dictionary.settingsPage.bonusAmount}</span>
                <input
                  name="bonusAmount"
                  type="number"
                  min="0"
                  max="10000000"
                  step="100"
                  defaultValue={driverBonusSettings.bonusAmount}
                />
              </label>
            </div>
            <p className="empty-state">{dictionary.settingsPage.bonusHint}</p>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.save}
              </button>
            </div>
          </form>
        </SectionShell>
      </main>
    </AppFrame>
  );
}
