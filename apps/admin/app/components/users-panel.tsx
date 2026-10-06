import Link from "next/link";

import { updateUserAction } from "../lib/admin-actions";
import { AdminDictionary, AdminLocale } from "../lib/admin-i18n";
import { UserSnapshot } from "../lib/backoffice";
import { formatDate, formatMoney } from "../lib/backoffice-view";
import { StatusPill } from "./status-pill";

type UsersPanelProps = {
  users: UserSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  returnPath?: string;
  showActions?: boolean;
  linkToDetails?: boolean;
};

function userTitle(user: UserSnapshot): string {
  return user.name?.trim() || user.phone;
}

export function UsersPanel({
  users,
  locale,
  dictionary,
  returnPath,
  showActions = false,
  linkToDetails = true,
}: UsersPanelProps) {
  if (users.length === 0) {
    return <p className="empty-state">{dictionary.usersPanel.empty}</p>;
  }

  return (
    <div className="actor-grid">
      {users.map((user) => (
        <article key={user.id} className="actor-card">
          <div className="actor-card__top">
            <div>
              <h3>
                {linkToDetails ? (
                  <Link
                    href={`/users/${user.id}?lang=${locale}`}
                    className="table-link"
                  >
                    {userTitle(user)}
                  </Link>
                ) : (
                  userTitle(user)
                )}
              </h3>
              <p>{user.phone}</p>
            </div>
            <StatusPill tone={user.isBlocked ? "danger" : "success"}>
              {user.isBlocked
                ? dictionary.forms.blockedBadge
                : dictionary.forms.unblockedBadge}
            </StatusPill>
          </div>

          <dl className="detail-list">
            <div>
              <dt>{dictionary.forms.language}</dt>
              <dd>{user.preferredLanguage.toUpperCase()}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.currency}</dt>
              <dd>{user.preferredCurrency}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.bonusBalance}</dt>
              <dd>
                {formatMoney(user.bonusBalance, user.preferredCurrency, locale)}
              </dd>
            </div>
            <div>
              <dt>{dictionary.forms.createdAt}</dt>
              <dd>{formatDate(user.createdAt, locale)}</dd>
            </div>
            <div>
              <dt>{dictionary.table.id}</dt>
              <dd>{user.id}</dd>
            </div>
          </dl>

          {showActions && returnPath ? (
            <div className="actor-card__actions">
              <form
                action={updateUserAction}
                className="admin-form admin-form--card"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="userId" value={user.id} />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.name}</span>
                    <input name="name" defaultValue={user.name ?? ""} />
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.language}</span>
                    <select
                      name="preferredLanguage"
                      defaultValue={user.preferredLanguage}
                    >
                      <option value="ru">{dictionary.shell.languageRu}</option>
                      <option value="kk">{dictionary.shell.languageKk}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{dictionary.forms.currency}</span>
                    <select
                      name="preferredCurrency"
                      defaultValue={user.preferredCurrency}
                    >
                      <option value="KZT">KZT</option>
                      <option value="RUB">RUB</option>
                    </select>
                  </label>
                </div>
                <div className="button-row">
                  <button
                    type="submit"
                    className="action-button action-button--soft"
                  >
                    {dictionary.forms.save}
                  </button>
                </div>
              </form>

              <form action={updateUserAction} className="inline-form">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="userId" value={user.id} />
                <input
                  type="hidden"
                  name="isBlocked"
                  value={user.isBlocked ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="action-button action-button--ghost"
                >
                  {user.isBlocked
                    ? dictionary.forms.unblock
                    : dictionary.forms.block}
                </button>
              </form>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
