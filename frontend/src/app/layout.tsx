import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

// Tipografia de la marca del grupo (gabame.com usa Lato).
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });

export const metadata: Metadata = {
  title: "Cuenta GABAME",
  description: "Portal de clientes y profesionales de la salud de GABAME.",
  icons: { icon: "/marca/favicon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={lato.variable}>
      <body className="font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
