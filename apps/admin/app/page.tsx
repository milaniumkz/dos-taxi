import { AppFrame } from "./components/app-frame";
import { BackofficeDashboard } from "./components/backoffice-dashboard";
import { getAdminPageContext } from "./lib/admin-i18n";
import { getSearchParam, resolveRouteSearchParams } from "./lib/admin-routing";
import { getBackofficeSnapshot, getExecutorsSnapshot } from "./lib/backoffice";

type HomePageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await resolveRouteSearchParams(searchParams);
  const { locale, dictionary } =
    await getAdminPageContext(resolvedSearchParams);
  const notice = getSearchParam(resolvedSearchParams, "notice");
  const error = getSearchParam(resolvedSearchParams, "error");
  const [snapshot, pendingExecutors] = await Promise.all([
    getBackofficeSnapshot(),
    getExecutorsSnapshot({ verificationStatus: "pending", limit: 4 }),
  ]);

  return (
    <AppFrame
      current="dashboard"
      snapshot={snapshot}
      locale={locale}
      dictionary={dictionary}
    >
      <BackofficeDashboard
        snapshot={snapshot}
        pendingExecutors={pendingExecutors}
        locale={locale}
        dictionary={dictionary}
        notice={notice}
        error={error}
      />
    </AppFrame>
  );
}
