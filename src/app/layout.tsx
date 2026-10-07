import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeatGuard AI",
  description: "Heat-risk signals → actionable intervention → supervisor confirmation → auditable safety record.",
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
