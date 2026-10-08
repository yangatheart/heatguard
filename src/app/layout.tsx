import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteSafe SI — Site Safety Super Intelligence",
  description: "SiteSafe SI turns measurable site conditions into actionable safety intelligence. Sense → Understand → Act → Record.",
};

export const viewport: Viewport = { themeColor: "#f5f5f2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
