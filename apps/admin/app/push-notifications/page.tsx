import { randomUUID } from "node:crypto";
import { AppFrame } from "../components/app-frame";
import { FlashBanner } from "../components/flash-banner";
import { SectionShell } from "../components/section-shell";
import { sendPushNotificationAction } from "../lib/admin-actions";
import { adminApiRequest } from "../lib/admin-api";
import { getAdminPageContext } from "../lib/admin-i18n";
import { getSearchParam, resolveRouteSearchParams } from "../lib/admin-routing";
import { getBackofficeSnapshot } from "../lib/backoffice";
import { PushCampaigns, pushLabels } from "../lib/push-notifications-i18n";

export const dynamic = "force-dynamic";
export default async function PushNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } = await getAdminPageContext(params);
  const labels = pushLabels(locale);
  const snapshot = await getBackofficeSnapshot();
  let campaigns: PushCampaigns | undefined;
  try {
    campaigns = await adminApiRequest<PushCampaigns>(
      "admin/push-notifications",
      { cache: "no-store" },
    );
  } catch {
    /* Disable sending when recipient data is unavailable. */
  }
  return (
    <AppFrame
      current="pushNotifications"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner
          notice={getSearchParam(params, "notice")}
          error={getSearchParam(params, "error")}
        />
        <SectionShell
          eyebrow={labels.title}
          title={labels.title}
          description={labels.description}
        >
          {campaigns ? (
            <p>
              {labels.devices}: {labels.passenger} —{" "}
              {campaigns.devices.passenger}; {labels.driver} —{" "}
              {campaigns.devices.driver}
            </p>
          ) : (
            <p role="alert">{labels.unavailable}</p>
          )}
          <form action={sendPushNotificationAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="requestId" value={randomUUID()} />
            <fieldset
              disabled={!campaigns}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              <label className="field">
                <span>{labels.audience}</span>
                <select name="audience" defaultValue="passenger">
                  <option value="passenger">{labels.passenger}</option>
                  <option value="driver">{labels.driver}</option>
                  <option value="all">{labels.all}</option>
                </select>
              </label>
              <label className="field">
                <span>{labels.subject}</span>
                <input name="title" required maxLength={100} />
              </label>
              <label className="field">
                <span>{labels.body}</span>
                <textarea name="body" required maxLength={1000} rows={5} />
              </label>
              <div className="button-row">
                <button type="submit" className="action-button">
                  {labels.send}
                </button>
              </div>
            </fieldset>
          </form>
        </SectionShell>
        <SectionShell
          eyebrow={labels.history}
          title={labels.history}
          description={labels.queued}
        >
          {!campaigns?.items.length ? (
            <p>{labels.empty}</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{labels.date}</th>
                    <th>{labels.subject}</th>
                    <th>{labels.audience}</th>
                    <th>{labels.queued}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {new Date(item.createdAt).toLocaleString(
                          locale === "kk" ? "kk-KZ" : "ru-KZ",
                        )}
                      </td>
                      <td>
                        {item.title}
                        <p>{item.body}</p>
                      </td>
                      <td>{labels[item.audience]}</td>
                      <td>
                        {item.status === "queued" ? (
                          item.queuedDevices
                        ) : (
                          <>
                            <p>{labels.pending}</p>
                            <form action={sendPushNotificationAction}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="requestId"
                                value={item.id}
                              />
                              <input
                                type="hidden"
                                name="audience"
                                value={item.audience}
                              />
                              <input
                                type="hidden"
                                name="title"
                                value={item.title}
                              />
                              <input
                                type="hidden"
                                name="body"
                                value={item.body}
                              />
                              <button type="submit" className="action-button">
                                {labels.retry}
                              </button>
                            </form>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>
      </main>
    </AppFrame>
  );
}
