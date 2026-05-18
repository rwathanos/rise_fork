"use client";

type Block = {
  width?: string;
  height?: string;
  rounded?: string;
};

type Props = {
  className?: string;
  blocks: Block[];
};

export function LoadingSkeleton({ className, blocks }: Props) {
  return (
    <div className={`glass-card animate-pulse rounded-2xl p-5 ${className ?? ""}`.trim()}>
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div
            key={`${block.width ?? "w-full"}-${block.height ?? "h-4"}-${index}`}
            className={`bg-[#89a8cf33] ${block.width ?? "w-full"} ${block.height ?? "h-4"} ${block.rounded ?? "rounded-md"}`}
          />
        ))}
      </div>
    </div>
  );
}

