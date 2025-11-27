// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";

import DashboardLayout from "@/components/dashboard-layout";
import AuthHeader from "@/components/AuthHeader";
import { Providers } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "SL-Mobility",
  description: "This is the analytics dashboard for SL-Mobility.",
  generator: "Safnas Kaldeen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Determine theme on the server to ensure consistent rendering
  const cookieStore = cookies();
  // const theme = cookieStore.get("theme") || { value: "dark" };
  const theme = { value: "dark" };
  const isDarkMode = theme?.value === "dark";

  return (
    <html
      lang="en"
      className={isDarkMode ? "dark" : ""}
      style={isDarkMode ? { colorScheme: "dark" } : {}}
    >
      <body>
        <Providers>
          <DashboardLayout>{children}</DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}
