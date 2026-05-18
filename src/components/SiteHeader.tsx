"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { WalletButton } from "@/components/WalletButton";

const links = [
  { href: "/", label: "发现" },
  { href: "/create", label: "创建代币" },
  { href: "/portfolio", label: "账户" },
  { href: "/legal/risk", label: "风险披露" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111faa]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-[family-name:var(--font-serif)] text-lg font-semibold tracking-[0.04em] text-[#d5e8ff]">
            RISE BSC
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-[#c2d2ea] md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? "text-white" : "hover:text-[#ecf8ff]"}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="line-btn inline-flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
            aria-label="打开导航菜单"
          >
            <span className="text-sm text-[#d6e7ff]">{menuOpen ? "✕" : "☰"}</span>
          </button>
          <WalletButton />
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-white/10 bg-[#081427f2] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2 text-sm text-[#cfe0f6]">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2 ${pathname === link.href ? "bg-[#12304d] text-white" : "hover:bg-[#102740] hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
