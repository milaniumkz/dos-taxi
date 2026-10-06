import { CreationPage } from "../../components/creation-page";
import type { RouteSearchParams } from "../../lib/admin-routing";
export default function Page({
  searchParams,
}: {
  searchParams?: Promise<RouteSearchParams>;
}) {
  return <CreationPage kind="tariffs" searchParams={searchParams} />;
}
