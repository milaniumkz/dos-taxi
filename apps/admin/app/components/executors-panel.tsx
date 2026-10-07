import Link from "next/link";

import {
  AdminDictionary,
  AdminLocale,
  translateExecutorType,
  translateVerificationStatus,
  translateVehicleType,
} from "../lib/admin-i18n";
import {
  blockExecutorAction,
  verifyExecutorAction,
} from "../lib/admin-actions";
import { ExecutorSnapshot } from "../lib/backoffice";
import { formatDate, formatNumber } from "../lib/backoffice-view";
import { StatusPill } from "./status-pill";

type ExecutorsPanelProps = {
  executors: ExecutorSnapshot[];
  locale: AdminLocale;
  dictionary: AdminDictionary;
  returnPath?: string;
  showActions?: boolean;
  linkToDetails?: boolean;
};

const CAR_CLASS_OPTIONS = ["economy", "comfort", "comfort_plus", "business", "together", "child"];

function executorTitle(executor: ExecutorSnapshot): string {
  return executor.user?.name?.trim() || executor.user?.phone || executor.id;
}

function executorCityLabel(
  executor: ExecutorSnapshot,
  locale: AdminLocale,
): string {
  if (locale === "kk") {
    return executor.cityNameKk || executor.cityNameRu || "-";
  }
  return executor.cityNameRu || executor.cityNameKk || "-";
}

function carClassLabel(value: string, dictionary: AdminDictionary): string {
  switch (value) {
    case "economy":
      return dictionary.forms.carClassEconomy;
    case "comfort":
      return dictionary.forms.carClassComfort;
    case "comfort_plus":
      return dictionary.forms.carClassComfortPlus;
    case "together":
      return dictionary.forms.carClassTogether;
    case "child":
      return dictionary.forms.carClassChild;
    case "business":
      return dictionary.forms.carClassBusiness;
    default:
      return value;
  }
}

function vehicleDetailsLabel(executor: ExecutorSnapshot): string {
  const parts = [
    executor.vehicleMake,
    executor.vehicleModel,
    executor.vehicleYear ? String(executor.vehicleYear) : null,
  ].filter(Boolean);
  const plate = executor.vehiclePlate?.trim();
  if (parts.length > 0 && plate) {
    return `${parts.join(" ")} · ${plate}`;
  }
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return plate || "-";
}

export function ExecutorsPanel({
  executors,
  locale,
  dictionary,
  returnPath,
  showActions = false,
  linkToDetails = true,
}: ExecutorsPanelProps) {
  if (executors.length === 0) {
    return <p className="empty-state">{dictionary.executorsPanel.empty}</p>;
  }

  return (
    <div className="actor-grid">
      {executors.map((executor) => (
        <article key={executor.id} className="actor-card">
          <div className="actor-card__top">
            <div>
              <h3>
                {linkToDetails ? (
                  <Link
                    href={`/executors/${executor.id}?lang=${locale}`}
                    className="table-link"
                  >
                    {executorTitle(executor)}
                  </Link>
                ) : (
                  executorTitle(executor)
                )}
              </h3>
              <p>{executor.user?.phone || executor.userId}</p>
            </div>
            <div className="status-stack">
              <StatusPill tone={executor.isOnline ? "success" : "neutral"}>
                {executor.isOnline
                  ? dictionary.forms.onlineBadge
                  : dictionary.forms.offlineBadge}
              </StatusPill>
              <StatusPill
                tone={
                  executor.verificationStatus === "verified"
                    ? "success"
                    : executor.verificationStatus === "rejected"
                      ? "danger"
                      : "warning"
                }
              >
                {translateVerificationStatus(
                  executor.verificationStatus,
                  dictionary,
                )}
              </StatusPill>
              {executor.isBlocked ? (
                <StatusPill tone="danger">
                  {dictionary.forms.blockedBadge}
                </StatusPill>
              ) : null}
            </div>
          </div>

          <dl className="detail-list">
            <div>
              <dt>{dictionary.forms.executorType}</dt>
              <dd>
                {translateExecutorType(executor.executorType, dictionary)}
              </dd>
            </div>
            <div>
              <dt>{dictionary.forms.vehicleType}</dt>
              <dd>
                {executor.vehicleType
                  ? translateVehicleType(executor.vehicleType, dictionary)
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>{dictionary.forms.vehicleClass}</dt>
              <dd>
                {executor.carClass
                  ? carClassLabel(executor.carClass, dictionary)
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>{dictionary.forms.vehicleMake}</dt>
              <dd>{vehicleDetailsLabel(executor)}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.city}</dt>
              <dd>{executorCityLabel(executor, locale)}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.rating}</dt>
              <dd>{formatNumber(executor.rating, locale, 2)}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.cancelRate}</dt>
              <dd>{formatNumber(executor.cancelRate, locale, 2)}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.balance}</dt>
              <dd>{formatNumber(executor.balance, locale, 2)}</dd>
            </div>
            <div>
              <dt>{dictionary.forms.createdAt}</dt>
              <dd>{formatDate(executor.createdAt, locale)}</dd>
            </div>
            <div>
              <dt>{dictionary.table.id}</dt>
              <dd>{executor.id}</dd>
            </div>
          </dl>

          {showActions && returnPath ? (
            <div className="actor-card__actions">
              <form
                action={verifyExecutorAction}
                className="admin-form admin-form--card"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="executorId" value={executor.id} />
                <div className="admin-form__grid">
                  <label className="field">
                    <span>{dictionary.forms.verificationStatus}</span>
                    <select
                      name="verificationStatus"
                      defaultValue={executor.verificationStatus}
                    >
                      <option value="pending">
                        {translateVerificationStatus("pending", dictionary)}
                      </option>
                      <option value="verified">
                        {translateVerificationStatus("verified", dictionary)}
                      </option>
                      <option value="rejected">
                        {translateVerificationStatus("rejected", dictionary)}
                      </option>
                    </select>
                  </label>
                  {executor.executorType === "driver" ? (
                    <label className="field">
                      <span>{dictionary.forms.assignedCarClass}</span>
                      <select
                        name="carClass"
                        defaultValue={executor.carClass ?? "economy"}
                      >
                        {CAR_CLASS_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {carClassLabel(value, dictionary)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
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

              <form action={blockExecutorAction} className="inline-form">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="returnPath" value={returnPath} />
                <input type="hidden" name="executorId" value={executor.id} />
                <input
                  type="hidden"
                  name="isBlocked"
                  value={executor.isBlocked ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="action-button action-button--ghost"
                >
                  {executor.isBlocked
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
