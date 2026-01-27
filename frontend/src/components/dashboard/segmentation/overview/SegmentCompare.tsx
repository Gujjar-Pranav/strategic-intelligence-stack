"use client";

import React from "react";
import clsx from "clsx";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import { fmtNumber, pct, getClusterNames } from "../utils";

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function DeltaBadge({
  delta,
  higherIsBetter = true,
  suffix = "",
}: {
  delta?: number; // A - B
  higherIsBetter?: boolean;
  suffix?: string;
}) {
  if (typeof delta !== "number") {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600">
        —
      </span>
    );
  }

  const good = higherIsBetter ? delta > 0 : delta < 0;
  const bad = higherIsBetter ? delta < 0 : delta > 0;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        good && "border-emerald-200 bg-emerald-50 text-emerald-700",
        bad && "border-rose-200 bg-rose-50 text-rose-700",
        !good && !bad && "border-gray-200 bg-gray-50 text-gray-700"
      )}
    >
      {delta > 0 ? "A" : delta < 0 ? "B" : "Tie"}{" "}
      <span className="ml-1 opacity-80">
        ({delta > 0 ? "+" : ""}
        {fmtNumber(delta, 2)}
        {suffix})
      </span>
    </span>
  );
}

export function SegmentCompare({ tables }: { tables: any }) {
  const names = getClusterNames(tables);

  const [a, setA] = React.useState<string>(names[0] ?? "");
  const [b, setB] = React.useState<string>(names[1] ?? names[0] ?? "");
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    if (!a && names[0]) setA(names[0]);
    if (!b && (names[1] ?? names[0])) setB(names[1] ?? names[0]);
  }, [names, a, b]);

  const revenue = Array.isArray(tables.revenue_contribution_named)
    ? tables.revenue_contribution_named
    : [];
  const promo = Array.isArray(tables.promo_roi) ? tables.promo_roi : [];
  const risk = Array.isArray(tables.discount_risk) ? tables.discount_risk : [];
  const channel = Array.isArray(tables.channel_strategy)
    ? tables.channel_strategy
    : [];
  const clv = Array.isArray(tables.clv_summary) ? tables.clv_summary : [];
  const rfm = Array.isArray(tables.rfm_summary) ? tables.rfm_summary : [];

  function rowFor(name: string) {
    return {
      revenue: revenue.find((x: any) => x.Cluster_Name === name),
      promo: promo.find((x: any) => x.Cluster_Name === name),
      risk: risk.find((x: any) => x.Cluster_Name === name),
      channel: channel.find((x: any) => x.Cluster_Name === name),
      clv: clv.find((x: any) => x.Cluster_Name === name),
      rfm: rfm.find((x: any) => x.Cluster_Name === name),
    };
  }

  const A = rowFor(a);
  const B = rowFor(b);

  if (!names.length) return null;

  const swap = () => {
    setA(b);
    setB(a);
  };

  const MetricRow = ({
    label,
    left,
    right,
    delta,
    higherIsBetter,
    suffix,
  }: {
    label: string;
    left: React.ReactNode;
    right: React.ReactNode;
    delta?: number;
    higherIsBetter?: boolean;
    suffix?: string;
  }) => (
    <div className="grid grid-cols-12 gap-3 py-3 border-t border-gray-100 text-sm items-center">
      <div className="col-span-5 text-gray-900">{label}</div>
      <div className="col-span-3 font-semibold text-gray-900">{left}</div>
      <div className="col-span-3 font-semibold text-gray-900">{right}</div>
      <div className="col-span-1 flex justify-end">
        <DeltaBadge delta={delta} higherIsBetter={higherIsBetter} suffix={suffix} />
      </div>
    </div>
  );

  // numeric deltas: A - B
  const revenueShareDelta =
    toNum(A.revenue?.["Revenue_%"]) !== undefined &&
    toNum(B.revenue?.["Revenue_%"]) !== undefined
      ? (toNum(A.revenue?.["Revenue_%"]) as number) -
        (toNum(B.revenue?.["Revenue_%"]) as number)
      : undefined;

  const promoDelta =
    toNum(A.promo?.Promo_Response_Rate) !== undefined &&
    toNum(B.promo?.Promo_Response_Rate) !== undefined
      ? ((toNum(A.promo?.Promo_Response_Rate) as number) -
          (toNum(B.promo?.Promo_Response_Rate) as number)) *
        100
      : undefined;

  const riskDelta =
    toNum(A.risk?.Discount_Addicted_Rate) !== undefined &&
    toNum(B.risk?.Discount_Addicted_Rate) !== undefined
      ? ((toNum(A.risk?.Discount_Addicted_Rate) as number) -
          (toNum(B.risk?.Discount_Addicted_Rate) as number)) *
        100
      : undefined;

  const clvDelta =
    toNum(A.clv?.Avg_CLV_Proxy) !== undefined &&
    toNum(B.clv?.Avg_CLV_Proxy) !== undefined
      ? (toNum(A.clv?.Avg_CLV_Proxy) as number) -
        (toNum(B.clv?.Avg_CLV_Proxy) as number)
      : undefined;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      {/* Header (keep as-is) */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Segment Comparison
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Side-by-side view with deltas (who wins each metric).
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "View"}
          <ChevronDown
            size={14}
            className={clsx(
              "transition-transform",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </button>
      </div>

      {/* ✅ Controls: ONE LINE on desktop, clean stack on mobile */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <select
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900"
        >
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <button
          onClick={swap}
          className="w-full sm:w-auto shrink-0 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          title="Swap"
        >
          <ArrowLeftRight size={16} />
          Swap
        </button>

        <select
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900"
        >
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900">
            <div className="col-span-5">Metric</div>
            <div className="col-span-3">{a}</div>
            <div className="col-span-3">{b}</div>
            <div className="col-span-1 text-right">Δ</div>
          </div>

          <div className="px-4 pb-2">
            <MetricRow
              label="Revenue share"
              left={`${fmtNumber(A.revenue?.["Revenue_%"], 2)}%`}
              right={`${fmtNumber(B.revenue?.["Revenue_%"], 2)}%`}
              delta={revenueShareDelta}
              higherIsBetter
              suffix="%"
            />

            <MetricRow
              label="Customers"
              left={fmtNumber(A.revenue?.Customers, 0)}
              right={fmtNumber(B.revenue?.Customers, 0)}
              delta={
                toNum(A.revenue?.Customers) !== undefined &&
                toNum(B.revenue?.Customers) !== undefined
                  ? (toNum(A.revenue?.Customers) as number) -
                    (toNum(B.revenue?.Customers) as number)
                  : undefined
              }
              higherIsBetter
            />

            <MetricRow
              label="Promo response"
              left={pct(A.promo?.Promo_Response_Rate, 1)}
              right={pct(B.promo?.Promo_Response_Rate, 1)}
              delta={promoDelta}
              higherIsBetter
              suffix="%"
            />

            <MetricRow
              label="Deal dependency"
              left={fmtNumber(A.promo?.Avg_Deal_Dependency, 3)}
              right={fmtNumber(B.promo?.Avg_Deal_Dependency, 3)}
              delta={
                toNum(A.promo?.Avg_Deal_Dependency) !== undefined &&
                toNum(B.promo?.Avg_Deal_Dependency) !== undefined
                  ? (toNum(A.promo?.Avg_Deal_Dependency) as number) -
                    (toNum(B.promo?.Avg_Deal_Dependency) as number)
                  : undefined
              }
              higherIsBetter={false}
            />

            <MetricRow
              label="Discount addicted"
              left={pct(A.risk?.Discount_Addicted_Rate, 1)}
              right={pct(B.risk?.Discount_Addicted_Rate, 1)}
              delta={riskDelta}
              higherIsBetter={false}
              suffix="%"
            />

            <MetricRow
              label="Avg CLV proxy"
              left={fmtNumber(A.clv?.Avg_CLV_Proxy, 0)}
              right={fmtNumber(B.clv?.Avg_CLV_Proxy, 0)}
              delta={clvDelta}
              higherIsBetter
            />

            <MetricRow
              label="RFM Monetary"
              left={fmtNumber(A.rfm?.Monetary_RFM, 2)}
              right={fmtNumber(B.rfm?.Monetary_RFM, 2)}
              delta={
                toNum(A.rfm?.Monetary_RFM) !== undefined &&
                toNum(B.rfm?.Monetary_RFM) !== undefined
                  ? (toNum(A.rfm?.Monetary_RFM) as number) -
                    (toNum(B.rfm?.Monetary_RFM) as number)
                  : undefined
              }
              higherIsBetter
            />

            <MetricRow
              label="Channel Web %"
              left={pct(A.channel?.Web_Purchase_Ratio, 1)}
              right={pct(B.channel?.Web_Purchase_Ratio, 1)}
              delta={
                toNum(A.channel?.Web_Purchase_Ratio) !== undefined &&
                toNum(B.channel?.Web_Purchase_Ratio) !== undefined
                  ? ((toNum(A.channel?.Web_Purchase_Ratio) as number) -
                      (toNum(B.channel?.Web_Purchase_Ratio) as number)) *
                    100
                  : undefined
              }
              higherIsBetter
              suffix="%"
            />

            <MetricRow
              label="Channel Store %"
              left={pct(A.channel?.Store_Purchase_Ratio, 1)}
              right={pct(B.channel?.Store_Purchase_Ratio, 1)}
              delta={
                toNum(A.channel?.Store_Purchase_Ratio) !== undefined &&
                toNum(B.channel?.Store_Purchase_Ratio) !== undefined
                  ? ((toNum(A.channel?.Store_Purchase_Ratio) as number) -
                      (toNum(B.channel?.Store_Purchase_Ratio) as number)) *
                    100
                  : undefined
              }
              higherIsBetter
              suffix="%"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
