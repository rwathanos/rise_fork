"use client";

type Props = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyStateCard({ title, description, className }: Props) {
  return (
    <div className={`glass-card rounded-2xl border-dashed p-10 text-center ${className ?? ""}`.trim()}>
      <p className="section-title text-base font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[#aac0dc]">{description}</p>
    </div>
  );
}

