import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { UnitsProvider } from "@/lib/units";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suivi Essence",
  description: "Suivi de consommation d'essence",
};

const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-900 dark:text-gray-100`}
      >
        <LanguageProvider>
          <UnitsProvider>
            <AuthProvider>
              <RequireAuth>{children}</RequireAuth>
            </AuthProvider>
          </UnitsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
