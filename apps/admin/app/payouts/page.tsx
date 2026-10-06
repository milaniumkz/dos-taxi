import Link from "next/link";

import { AppFrame } from "../components/app-frame";
import { FlashBanner } from "../components/flash-banner";
import { MetricCard } from "../components/metric-card";
import { SectionShell } from "../components/section-shell";
import { StatusPill } from "../components/status-pill";
import {
  createExecutorPayoutAction,
  updateExecutorPayoutAction,
} from "../lib/admin-actions";
import { getAdminPageContext } from "../lib/admin-i18n";
import {
  buildPathWithOverrides,
  buildReturnPath,
  getSearchParam,
  resolveRouteSearchParams,
} from "../lib/admin-routing";
import {
  ExecutorPayoutSnapshot,
  getBackofficeSnapshot,
  getExecutorPayoutsSnapshot,
  getExecutorsSnapshot,
} from "../lib/backoffice";
import { formatDate, formatNumber } from "../lib/backoffice-view";

type PayoutsPageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    status?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

type PayoutStatus = ExecutorPayoutSnapshot["status"];
type PayoutMethod = ExecutorPayoutSnapshot["method"];

const PAYOUT_STATUSES: PayoutStatus[] = ["pending", "paid", "rejected"];
const PAYOUT_METHODS: PayoutMethod[] = ["kaspi", "halyk", "cash"];

const RU = {
  total: "Всего выплат",
  pending: "Ожидают выплаты",
  paid: "Выплачено",
  rejected: "Отклонено",
  title: "Выплаты водителям",
  description:
    "Создайте выплату, выполните перевод вручную и подтвердите. После подтверждения сумма спишется с баланса водителя.",
  createTitle: "Создать выплату",
  createDescription: "Выберите водителя, сумму и способ выплаты.",
  listTitle: "Активные выплаты",
  historyTitle: "История выплат",
  empty: "Выплат по этому фильтру нет.",
  allStatuses: "Все статусы",
  executor: "Водитель",
  amount: "Сумма выплаты",
  method: "Способ выплаты",
  comment: "Комментарий",
  createdAt: "Создано",
  updatedAt: "Обновлено",
  paidAt: "Выплачено",
  openExecutor: "Открыть водителя",
  create: "Создать выплату",
  confirm: "Подтвердить выплату и списать",
  reject: "Отклонить",
  status: {
    pending: "Новая",
    paid: "Выплачено",
    rejected: "Отклонена",
  },
  methodLabel: {
    kaspi: "Kaspi",
    halyk: "Halyk",
    cash: "Наличные",
  },
};

const KK = {
  ...RU,
  total: "Барлық төлемдер",
  pending: "Төлем күтуде",
  paid: "Төленді",
  rejected: "Қабылданбады",
  title: "Жүргізуші төлемдері",
  description:
    "Төлем жасаңыз, аударымды қолмен орындаңыз және растаңыз. Растағаннан кейін сома жүргізуші балансынан шегеріледі.",
  createTitle: "Төлем жасау",
  createDescription: "Жүргізушіні, соманы және төлем тәсілін таңдаңыз.",
  listTitle: "Белсенді төлемдер",
  historyTitle: "Төлем тарихы",
  empty: "Бұл сүзгі бойынша төлем жоқ.",
  allStatuses: "Барлық күйлер",
  executor: "Жүргізуші",
  amount: "Төлем сомасы",
  method: "Төлем тәсілі",
  comment: "Пікір",
  createdAt: "Құрылды",
  updatedAt: "Жаңартылды",
  paidAt: "Төленді",
  openExecutor: "Жүргізушіні ашу",
  create: "Төлем жасау",
  confirm: "Растау және шегеру",
  reject: "Қабылдамау",
  status: {
    pending: "Жаңа",
    paid: "Төленді",
    rejected: "Қабылданбады",
  },
  methodLabel: {
    kaspi: "Kaspi",
    halyk: "Halyk",
    cash: "Қолма-қол",
  },
};

function labels(locale: "ru" | "kk") {
  return locale === "kk" ? KK : RU;
}

function normalizeStatus(value: string | undefined): PayoutStatus | "" {
  return PAYOUT_STATUSES.includes(value as PayoutStatus)
    ? (value as PayoutStatus)
    : "";
}

function statusTone(
  status: PayoutStatus,
): "success" | "warning" | "danger" | "neutral" {
  if (status === "paid") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  return "warning";
}

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const snapshot = await getBackofficeSnapshot();
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const t = labels(locale);
  const selectedStatus = normalizeStatus(
    getSearchParam(resolvedSearchParams, "status"),
  );
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const returnPath = buildReturnPath("/payouts", resolvedSearchParams, locale);
  const [executors, allPayouts] = await Promise.all([
    getExecutorsSnapshot({ limit: 200 }),
    getExecutorPayoutsSnapshot(),
  ]);
  const payouts = selectedStatus
    ? allPayouts.filter((payout) => payout.status === selectedStatus)
    : allPayouts;
  const activePayouts = selectedStatus
    ? payouts
    : allPayouts.filter((payout) => payout.status === "pending");
  const historyPayouts = selectedStatus
    ? []
    : allPayouts.filter((payout) => payout.status !== "pending");

  return (
    <AppFrame
      current="payouts"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <main className="admin-shell">
        <FlashBanner notice={notice} error={error} />

        <section className="metrics-grid">
          <MetricCard
            label={t.total}
            value={String(payouts.length)}
            hint={t.title}
            accent="gold"
          />
          <MetricCard
            label={t.pending}
            value={String(allPayouts.filter((p) => p.status === "pending").length)}
            hint={t.createTitle}
            accent="ember"
          />
          <MetricCard
            label={t.paid}
            value={String(allPayouts.filter((p) => p.status === "paid").length)}
            hint={t.historyTitle}
            accent="teal"
          />
          <MetricCard
            label={t.rejected}
            value={String(allPayouts.filter((p) => p.status === "rejected").length)}
            hint={t.historyTitle}
            accent="ink"
          />
        </section>

        <SectionShell
          eyebrow={t.method}
          title={t.createTitle}
          description={t.createDescription}
        >
          <form action={createExecutorPayoutAction} className="admin-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{t.executor}</span>
                <select name="executorId" required>
                  {executors.map((executor) => (
                    <option key={executor.id} value={executor.id}>
                      {executor.user?.name ||
                        executor.user?.phone ||
                        executor.id}{" "}
                      · {formatNumber(executor.balance, locale, 2)} ₸
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t.amount}</span>
                <input name="amount" type="number" min="1" step="1" required />
              </label>
              <label className="field">
                <span>{t.method}</span>
                <select name="method" defaultValue="kaspi">
                  {PAYOUT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {t.methodLabel[method]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t.comment}</span>
                <input name="adminComment" />
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {t.create}
              </button>
            </div>
          </form>
        </SectionShell>

        <SectionShell eyebrow={t.method} title={t.title} description={t.description}>
          <form method="GET" className="admin-form">
            <input type="hidden" name="lang" value={locale} />
            <div className="admin-form__grid">
              <label className="field">
                <span>{dictionary.forms.status}</span>
                <select name="status" defaultValue={selectedStatus}>
                  <option value="">{t.allStatuses}</option>
                  {PAYOUT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t.status[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="button-row">
              <button type="submit" className="action-button">
                {dictionary.forms.apply}
              </button>
              <Link
                href={buildPathWithOverrides(
                  "/payouts",
                  resolvedSearchParams,
                  locale,
                  { status: undefined },
                )}
                className="action-button action-button--ghost"
              >
                {dictionary.forms.clear}
              </Link>
            </div>
          </form>
        </SectionShell>

        <PayoutList
          title={t.listTitle}
          payouts={activePayouts}
          locale={locale}
          emptyLabel={t.empty}
          returnPath={returnPath}
          t={t}
        />

        {!selectedStatus && (
          <PayoutList
            title={t.historyTitle}
            payouts={historyPayouts}
            locale={locale}
            emptyLabel={t.empty}
            returnPath={returnPath}
            t={t}
            readOnly
          />
        )}
      </main>
    </AppFrame>
  );
}

function PayoutList({
  title,
  payouts,
  locale,
  emptyLabel,
  returnPath,
  t,
  readOnly = false,
}: {
  title: string;
  payouts: ExecutorPayoutSnapshot[];
  locale: "ru" | "kk";
  emptyLabel: string;
  returnPath: string;
  t: typeof RU;
  readOnly?: boolean;
}) {
  return (
    <SectionShell eyebrow={t.method} title={title} description={t.description}>
      {payouts.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <div className="actor-grid">
          {payouts.map((payout) => (
            <article key={payout.id} className="actor-card">
              <div className="actor-card__top">
                <div>
                  <h3>
                    {payout.executorName ||
                      payout.executorPhone ||
                      payout.executorId}
                  </h3>
                  <p>
                    {t.method}: {t.methodLabel[payout.method]}
                  </p>
                </div>
                <StatusPill tone={statusTone(payout.status)}>
                  {t.status[payout.status]}
                </StatusPill>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>{t.amount}</dt>
                  <dd>{formatNumber(payout.amount, locale, 2)} ₸</dd>
                </div>
                <div>
                  <dt>{t.createdAt}</dt>
                  <dd>{formatDate(payout.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t.updatedAt}</dt>
                  <dd>{formatDate(payout.updatedAt, locale)}</dd>
                </div>
                {payout.paidAt && (
                  <div>
                    <dt>{t.paidAt}</dt>
                    <dd>{formatDate(payout.paidAt, locale)}</dd>
                  </div>
                )}
                <div>
                  <dt>{t.executor}</dt>
                  <dd>
                    <Link
                      href={`/executors/${payout.executorId}?lang=${locale}`}
                      className="table-link"
                    >
                      {t.openExecutor}
                    </Link>
                  </dd>
                </div>
              </dl>
              {!readOnly && payout.status === "pending" && (
                <form
                  action={updateExecutorPayoutAction}
                  className="admin-form admin-form--card"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="payoutId" value={payout.id} />
                  <label className="field">
                    <span>{t.amount}</span>
                    <input name="amount" defaultValue={payout.amount} />
                  </label>
                  <label className="field">
                    <span>{t.method}</span>
                    <select name="method" defaultValue={payout.method}>
                      {PAYOUT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {t.methodLabel[method]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t.comment}</span>
                    <input
                      name="adminComment"
                      defaultValue={payout.adminComment ?? ""}
                    />
                  </label>
                  <div className="button-row">
                    <button
                      type="submit"
                      name="status"
                      value="paid"
                      className="action-button"
                    >
                      {t.confirm}
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="rejected"
                      className="action-button action-button--ghost"
                    >
                      {t.reject}
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
