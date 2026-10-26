import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#090d16",
};

export const metadata: Metadata = {
  title: "Mobills Pro — Controle Financeiro Pessoal, Cartões e Orçamento",
  description:
    "Plataforma completa de gestão financeira pessoal, contas bancárias, faturas de cartão de crédito, planejamento mensal por categoria, objetivos e relatórios.",
  manifest: "./manifest.json",
  icons: {
    icon: "./icon.svg",
    apple: "./icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mobills Pro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${plusJakarta.className} min-h-screen bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
