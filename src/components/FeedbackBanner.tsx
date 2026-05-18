"use client";

type Props = {
  tone: "success" | "error" | "info";
  message: string;
  className?: string;
};

export function FeedbackBanner({ tone, message, className }: Props) {
  const palette =
    tone === "success"
      ? "border-[#6ce6be66] bg-[#0e2b2288] text-[#baf7e5]"
      : tone === "error"
        ? "border-[#ffbf8b66] bg-[#2a1a1188] text-[#ffd5b0]"
        : "border-[#9cc3ef55] bg-[#0e213588] text-[#dcecff]";

  return <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${palette} ${className ?? ""}`.trim()}>{message}</p>;
}

