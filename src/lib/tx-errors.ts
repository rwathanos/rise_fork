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
  if (text) {
    const firstLine = text.split("\n")[0]?.trim();
    if (firstLine) return firstLine;
  }

  return "交易提交失败，请稍后重试。";
}
