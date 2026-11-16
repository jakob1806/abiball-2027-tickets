import type { Metadata } from "next";
import AdminNav from "@/components/AdminNav";
import { WristbandProvider } from "@/components/WristbandContext";
import { getWristbands } from "@/lib/wristbands";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const wristbands = await getWristbands();
  return (
    <WristbandProvider value={wristbands}>
      <AdminNav />
      {children}
    </WristbandProvider>
  );
}
