"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-[#ff9f9f]/35 bg-[#2a1010]/80 p-6 text-center">
      <h1 className="section-title text-xl font-semibold text-[#ffe0e0]">页面加载失败</h1>
      <p className="text-sm text-[#e8c4c4]">
        {error.message || "发现页渲染时出错，可能是浏览器缓存了旧的市场数据。"}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="primary-btn rounded-full px-4 py-2 text-sm font-semibold">
          重试
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem("rise-token-registry-v1");
            } catch {
              // ignore
            }
            reset();
          }}
          className="line-btn rounded-full px-4 py-2 text-sm"
        >
          清除本地市场缓存并重试
        </button>
      </div>
    </div>
  );
}
