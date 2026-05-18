"use client";

type Props = {
  title: string;
  lines: string[];
  tone?: "neutral" | "warn";
};

export function RiskSummaryCard({ title, lines, tone = "neutral" }: Props) {
  const toneClass =
    tone === "warn"
      ? "border-[#f3c18566] bg-[#2a1b0f99] text-[#ffe0bd]"
      : "border-[#92bdf04d] bg-[#07192f80] text-[#dcecff]";

  return (
    <div className={`mt-3 rounded-xl border p-4 text-sm ${toneClass}`}>
      <p className="font-medium">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

