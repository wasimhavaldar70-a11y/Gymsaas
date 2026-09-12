import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "../components/providers/AppProviders";
import { AppShell } from "../components/layout/AppShell";

export const metadata: Metadata = {
  title: "GYMCARE CRM - Multi-Tenant Gym Management SaaS",
  description: "Enterprise Gym CRM & Multi-Branch SaaS for Indian Fitness Centers, CrossFit & Yoga Studios with GST Billing, Realtime Attendance & Offline Sync.",
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-gym-red selection:text-white">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
