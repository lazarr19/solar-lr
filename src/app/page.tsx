import { getCachedPrices, getTodayInSerbia, getTomorrowInSerbia } from "@/lib/prices";
import DashboardClient from "@/components/DashboardClient";

export const revalidate = 3600;

export default async function Home() {
  const today = getTodayInSerbia();
  const tomorrow = getTomorrowInSerbia();
  const [todayData, tomorrowData] = await Promise.all([
    getCachedPrices(today),
    getCachedPrices(tomorrow),
  ]);
  return <DashboardClient todayData={todayData} tomorrowData={tomorrowData} />;
}
