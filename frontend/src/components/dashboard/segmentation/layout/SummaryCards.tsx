"use client";

import React from "react";
import clsx from "clsx";

function ColorNumbers({ value }: { value: React.ReactNode }) {
  if (typeof value !== "string" && typeof value !== "number") return <>{value}</>;

  const text = String(value);

  // split keeping numbers
  const parts = text.split(/(-?\d+(?:,\d{3})*(?:\.\d+)?)/g);

  return (
    <>
      {parts.map((p, i) => {
        const isNum = /^-?\d+(?:,\d{3})*(?:\.\d+)?$/.test(p);
        if (!isNum) return <React.Fragment key={i}>{p}</React.Fragment>;

        return (
          <span key={i} className="font-semibold text-indigo-600">
            {p}
          </span>
        );
      })}
    </>
  );
}

function Item({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full border px-3 py-2",
        "text-[12px] leading-none",
        emphasize
          ? "border-gray-900 bg-gray-900 text-white shadow-sm"
          : "border-gray-200 bg-white hover:bg-gray-50/60 transition"
      )}
    >
      <span
        className={clsx(
          "uppercase tracking-wide",
          emphasize ? "text-white/70" : "text-gray-500"
        )}
      >
        {label}
      </span>

      {/*  Only color the numeric parts */}
      <span className={clsx("font-semibold", emphasize ? "text-white" : "text-gray-900")}>
        <ColorNumbers value={value} />
      </span>

      {sub ? (
        <span className={clsx("text-[11px]", emphasize ? "text-white/60" : "text-gray-500")}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

export function SummaryCards({
  runCardPrimary,
  modeLabel,
  clustersLabel,
  rowsLabel,
  revenueProxyLabel,
}: {
  runCardPrimary: string;
  modeLabel: string;
  clustersLabel: string;
  rowsLabel: string;
  revenueProxyLabel: string;
}) {
  return (
    <div className="mt-4">
      {/* Ultra-compact elite KPI bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Item label="Run" value={runCardPrimary} sub={`mode: ${modeLabel}`} emphasize />
        <Item label="Clusters" value={clustersLabel} sub="prod" />
        <Item label="Rows" value={rowsLabel} sub="cleaned" />
        <Item label="Revenue" value={revenueProxyLabel} />
      </div>
    </div>
  );
}
