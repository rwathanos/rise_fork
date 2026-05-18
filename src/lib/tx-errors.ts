function collectErrorText(error: unknown): string[] {
  if (!error) return [];

  if (typeof error === "string") return [error];

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts: string[] = [];

    for (const key of ["shortMessage", "message", "details"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        parts.push(value);
      }
    }

    if ("cause" in record) {
      parts.push(...collectErrorText(record.cause));
    }

    return parts;
  }

  return [String(error)];
}

export function isUserRejectedError(error: unknown): boolean {
  const text = collectErrorText(error).join(" ").toLowerCase();
  return (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("denied request signature") ||
    text.includes("rejected the request")
  );
}

export function getTxErrorMessage(error: unknown): string {
  if (isUserRejectedError(error)) {
    return "你已在钱包中取消签名，交易未发送。";
  }

  const text = collectErrorText(error).join(" ").trim();
  const lower = text.toLowerCase();

  if (lower.includes("insufficientcollateral")) {
    return "借出数量超过可借上限，请减少借出储备或增加抵押代币。";
  }
  if (lower.includes("insufficientliquidity")) {
    return "池内可用储备不足，请减少借出数量或稍后再试。";
  }
  if (lower.includes("slippageexceeded")) {
    return "价格滑点超过限制，请调整数量后重试。";
  }

  if (text) {
    const firstLine = text.split("\n")[0]?.trim();
    if (firstLine) return firstLine;
  }

  return "交易提交失败，请稍后重试。";
}
