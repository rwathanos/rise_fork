import Link from "next/link";

import { factoryAddress } from "@/lib/contracts";

export function SiteFooter() {
  const factory = factoryAddress();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#07111f99]/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[#a8bbd8] md:flex-row md:items-center md:justify-between">
        <p>资产由链上合约托管，平台不持有私钥。</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/legal/risk" className="hover:text-[#e7f3ff]">
            风险披露
          </Link>
          {factory ? <span>Factory: {factory}</span> : <span>Factory 未配置</span>}
        </div>
      </div>
    </footer>
  );
}
