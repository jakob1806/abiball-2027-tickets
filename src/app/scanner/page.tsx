import type { Metadata, Viewport } from "next";
import ScannerApp from "@/components/ScannerApp";

export const metadata: Metadata = { title: "Einlass-Scanner", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" };

export default function ScannerPage() {
  return <ScannerApp />;
}
