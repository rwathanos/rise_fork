"use client";

type Props = {
  open: boolean;
  title: string;
  lines: string[];
  onCancel: () => void;
  onConfirm: () => void;
};

export function TransactionReviewModal({ open, title, lines, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 md:items-center">
      <div className="glass-card w-full max-w-md rounded-2xl p-5">
        <p className="section-title text-lg font-semibold">{title}</p>
        <div className="mt-3 space-y-2 text-sm text-[#d7e9ff]">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="line-btn flex-1 rounded-xl px-4 py-2 text-sm">
            取消
          </button>
          <button type="button" onClick={onConfirm} className="primary-btn flex-1 rounded-xl px-4 py-2 text-sm font-semibold">
            确认提交
          </button>
        </div>
      </div>
    </div>
  );
}

