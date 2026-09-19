import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "BizPilot — Run your business. Know your numbers.",
  description:
    "BizPilot is a modern business management platform for small and medium-sized businesses: sales, inventory, customers, expenses and profit, all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
