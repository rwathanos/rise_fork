"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isServerError = Boolean(error.digest);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#07111f", color: "#eef4ff" }}>
        <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>页面加载失败</h1>
          <p style={{ fontSize: 14, color: "#b9cae4", lineHeight: 1.6 }}>
            {isServerError ? "服务端渲染出错。" : "客户端渲染出错。"}
            {error.message ? ` 详情：${error.message}` : null}
          </p>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#8ea6c7", marginTop: 8 }}>错误 ID：{error.digest}</p>
          ) : null}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "10px 18px",
                background: "#41d8af",
                color: "#052136",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
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
              style={{
                border: "1px solid rgba(168,208,255,0.35)",
                borderRadius: 999,
                padding: "10px 18px",
                background: "transparent",
                color: "#eef4ff",
                cursor: "pointer",
              }}
            >
              清除市场缓存并重试
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
