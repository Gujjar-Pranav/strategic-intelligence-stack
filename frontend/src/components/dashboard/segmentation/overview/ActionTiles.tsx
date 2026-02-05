"use client";

import React from "react";
import clsx from "clsx";
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Store,
  ChevronDown,
} from "lucide-react";

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
      {icon}
      {label}
    </div>
  );
}

function ColorNumbers({ text }: { text: string }) {
  if (!text) return null;


  const parts = text.split(/(\$?₹?-?\d+(?:,\d{3})*(?:\.\d+)?%?)/g);

  return (
    <>
      {parts.map((part, idx) => {

        const isNumberLike = /^(\$?₹?-?\d+(?:,\d{3})*(?:\.\d+)?%?)$/.test(part);

        if (!isNumberLike) return <React.Fragment key={idx}>{part}</React.Fragment>;

        const isPct = part.endsWith("%");
        const isCurrency = part.startsWith("$") || part.startsWith("₹");
        const isNegative = part.includes("-");

        const cls = clsx(
          "font-semibold",
          isPct && "text-emerald-600",
          isCurrency && "text-blue-600",
          isNegative && "text-rose-600",
          !isPct && !isCurrency && !isNegative && "text-indigo-600"
        );

        return (
          <span key={idx} className={cls}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function TileCard({
  pill,
  title,
  sub,
}: {
  pill: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      {pill}

      <div className="mt-3 text-[16px] font-semibold leading-snug tracking-tight text-gray-900">
        <ColorNumbers text={title} />
      </div>

      <div className="mt-2 text-sm leading-relaxed text-gray-600">
        <ColorNumbers text={sub} />
      </div>

      <div className="mt-4 h-px w-full bg-gray-100" />
    </div>
  );
}

export function ActionTilesSection({
  tiles,
  printMode = false,
}: {
  tiles: { title: string; bold: string; sub: string }[];
  printMode?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  //  In printMode: always open, no accordion UI
  const isOpen = printMode ? true : open;

  const presets = [
    { pill: <Pill icon={<Sparkles size={14} />} label="Top opportunity" /> },
    { pill: <Pill icon={<TrendingUp size={14} />} label="Promo ROI action" /> },
    { pill: <Pill icon={<ShieldAlert size={14} />} label="Risk guardrail" /> },
    { pill: <Pill icon={<Store size={14} />} label="Channel focus" /> },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Action Tiles</div>
          <div className="mt-1 text-xs text-gray-600">
            Quick executive actions generated from cluster intelligence.
          </div>
        </div>

        {!printMode ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          >
            {open ? "Hide" : "View"}
            <ChevronDown
              size={16}
              className={clsx(
                "transition-transform",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {tiles.slice(0, 4).map((t, idx) => (
            <TileCard
              key={t.title}
              pill={
                presets[idx]?.pill ?? (
                  <Pill icon={<Sparkles size={14} />} label="Action" />
                )
              }
              title={t.bold}
              sub={t.sub}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
