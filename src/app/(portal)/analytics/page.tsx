import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/session";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getActiveUser();
  if (!user) redirect("/login");
  return <AnalyticsDashboard userName={user.name.split(" ")[0]} />;
}
