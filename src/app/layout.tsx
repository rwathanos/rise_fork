import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "RISE BSC",
  description: "BSC 链代币发射、地板价保护与无清算借贷平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen text-zinc-100">
        <Providers>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:py-10">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
