import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EVENT } from "@/lib/event";

export const metadata: Metadata = {
  title: { default: `${EVENT.title} · ${EVENT.school}`, template: `%s · ${EVENT.title}` },
  description: `${EVENT.title} des Abiturjahrgangs 2027 am ${EVENT.school}. ${EVENT.dateLabel}, ${EVENT.venueName}.`,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
