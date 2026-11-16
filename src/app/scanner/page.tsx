import type { Metadata, Viewport } from "next";
import ScannerApp from "@/components/ScannerApp";
import { WristbandProvider } from "@/components/WristbandContext";
import { getWristbands } from "@/lib/wristbands";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Einlass-Scanner", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" };

export default async function ScannerPage() {
  return (
    <WristbandProvider value={await getWristbands()}>
      <ScannerApp />
    </WristbandProvider>
  );
}
