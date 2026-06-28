import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../frontend/next/src/dashboard/index.css";
import "../frontend/next/src/customer/index.css";
import "../frontend/next/src/app/landing.css";
import "../frontend/next/src/dashboard/components/layout/AppLayout.css";
import "../frontend/next/src/dashboard/routes/login/AuthPages.css";

export const metadata: Metadata = {
  title: "AI Host | Restaurant AI Concierge",
  description: "A production-ready AI concierge platform for restaurants and small businesses.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
