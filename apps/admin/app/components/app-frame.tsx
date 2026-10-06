import Link from "next/link";

import { BackofficeSnapshot } from "../lib/backoffice";
import {
  AdminDictionary,
  AdminLocale,
  buildLocalizedHref,
} from "../lib/admin-i18n";
import { formatDate } from "../lib/backoffice-view";
import { StatusPill } from "./status-pill";

type AppSection =
  | "dashboard"
  | "orders"
  | "cities"
  | "tariffs"
  | "reports"
  | "promoCodes"
  | "users"
  | "executors"
  | "balanceTopUps"
  | "payouts"
  | "settings"
  | "notes"
  | "activity";

type AppFrameProps = {
  current: AppSection;
  snapshot: BackofficeSnapshot;
  children: React.ReactNode;
  locale: AdminLocale;
  dictionary: AdminDictionary;
};

const NAV_ITEMS: Array<{ key: AppSection; href: string }> = [
  { key: "dashboard", href: "/" },
  { key: "orders", href: "/orders" },
  { key: "cities", href: "/cities" },
  { key: "tariffs", href: "/tariffs" },
  { key: "reports", href: "/reports" },
  { key: "promoCodes", href: "/promo-codes" },
  { key: "users", href: "/users" },
  { key: "executors", href: "/executors" },
  { key: "balanceTopUps", href: "/balance-topups" },
  { key: "payouts", href: "/payouts" },
  { key: "settings", href: "/settings" },
  { key: "notes", href: "/notes" },
  { key: "activity", href: "/activity" },
];

function modeTone(
  mode: BackofficeSnapshot["mode"],
): "success" | "warning" | "neutral" {
  if (mode === "live") {
    return "success";
  }
  if (mode === "mixed") {
    return "warning";
  }
  return "neutral";
}

function navLabel(section: AppSection, dictionary: AdminDictionary): string {
  return dictionary.nav[section];
}

function runtimeLabel(
  mode: BackofficeSnapshot["mode"],
  dictionary: AdminDictionary,
): string {
  if (mode === "live") {
    return dictionary.shell.liveApi;
  }
  if (mode === "mixed") {
    return dictionary.shell.partialApi;
  }
  return dictionary.shell.demoSnapshot;
}

export function AppFrame({
  current,
  snapshot,
  children,
  locale,
  dictionary,
}: AppFrameProps) {
  const activeOrders = snapshot.orders.filter((order) =>
    ["searching", "accepted", "arriving", "waiting", "in_progress"].includes(
      order.status,
    ),
  ).length;
  const activeCities = snapshot.cities.filter((city) => city.isActive).length;
  const currentHref =
    NAV_ITEMS.find((item) => item.key === current)?.href ?? "/";

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="eyebrow">{dictionary.shell.eyebrow}</span>
          <h1>{dictionary.shell.title}</h1>
          <p>{dictionary.shell.description}</p>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={buildLocalizedHref(item.href, locale)}
              className={`admin-nav__link ${
                current === item.key ? "admin-nav__link--active" : ""
              }`.trim()}
            >
              <span>{navLabel(item.key, dictionary)}</span>
              {current === item.key ? (
                <strong>{dictionary.shell.open}</strong>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="locale-switcher">
          <span className="locale-switcher__label">
            {dictionary.shell.language}
          </span>
          <div className="locale-switcher__actions">
            <Link
              href={buildLocalizedHref(currentHref, "ru")}
              className={`locale-switcher__link ${
                locale === "ru" ? "locale-switcher__link--active" : ""
              }`.trim()}
            >
              {dictionary.shell.languageRu}
            </Link>
            <Link
              href={buildLocalizedHref(currentHref, "kk")}
              className={`locale-switcher__link ${
                locale === "kk" ? "locale-switcher__link--active" : ""
              }`.trim()}
            >
              {dictionary.shell.languageKk}
            </Link>
          </div>
        </div>

        <div className="admin-sidebar__stats">
          <div>
            <span>{dictionary.shell.activeOrders}</span>
            <strong>{activeOrders}</strong>
          </div>
          <div>
            <span>{dictionary.shell.citiesOnline}</span>
            <strong>{activeCities}</strong>
          </div>
          <div>
            <span>{dictionary.shell.source}</span>
            <strong>{snapshot.sourceLabel}</strong>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar__label">
              {dictionary.shell.runtime}
            </span>
            <div className="admin-topbar__meta">
              <StatusPill tone={modeTone(snapshot.mode)}>
                {runtimeLabel(snapshot.mode, dictionary)}
              </StatusPill>
              <span>
                {dictionary.shell.updatedAt}:{" "}
                {formatDate(snapshot.generatedAt, locale)}
              </span>
            </div>
          </div>
          <div className="admin-topbar__summary">
            <span>{dictionary.shell.backendBase}</span>
            <strong>{snapshot.sourceLabel}</strong>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
