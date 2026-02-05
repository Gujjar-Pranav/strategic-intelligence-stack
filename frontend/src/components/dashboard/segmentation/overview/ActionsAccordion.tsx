"use client";

import React from "react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus, ChevronDown } from "lucide-react";
import { fmtNumber, pct, toActionBullets } from "../utils";

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function percentileRank(values: number[], v: number) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  let idx = sorted.findIndex((x) => x >= v);
  if (idx === -1) idx = sorted.length - 1;
  const denom = Math.max(1, sorted.length - 1);
  return idx / denom; // 0..1
}

function signalForMetric({
  metric,
  value,
  allValues,
}: {
  metric: "R" | "F" | "M";
  value?: number;
  allValues: number[];
}) {
  if (typeof value !== "number") return { tone: "neutral" as const, dir: "flat" as const };

  const p = percentileRank(allValues, value);
  if (typeof p !== "number") return { tone: "neutral" as const, dir: "flat" as const };

  const hi = 0.66;
  const lo = 0.33;

  // Recency: lower is better
  if (metric === "R") {
    if (p <= lo) return { tone: "good" as const, dir: "down" as const };
    if (p >= hi) return { tone: "bad" as const, dir: "up" as const };
    return { tone: "neutral" as const, dir: "flat" as const };
  }

  // Frequency / Monetary: higher is better
  if (p >= hi) return { tone: "good" as const, dir: "up" as const };
  if (p <= lo) return { tone: "bad" as const, dir: "down" as const };
  return { tone: "neutral" as const, dir: "flat" as const };
}

function rfmDotTone({
  r,
  f,
  m,
  allR,
  allF,
  allM,
}: {
  r?: number;
  f?: number;
  m?: number;
  allR: number[];
  allF: number[];
  allM: number[];
}) {
  const Rs = signalForMetric({ metric: "R", value: r, allValues: allR });
  const Fs = signalForMetric({ metric: "F", value: f, allValues: allF });
  const Ms = signalForMetric({ metric: "M", value: m, allValues: allM });

  const tones = [Rs.tone, Fs.tone, Ms.tone];

  if (tones.includes("bad")) return "bad" as const;
  if (tones.includes("good")) return "good" as const;
  return "neutral" as const;
}

function RfmValue({
  label,
  value,
  metric,
  allValues,
}: {
  label: string;
  value?: number;
  metric: "R" | "F" | "M";
  allValues: number[];
}) {
  const s = signalForMetric({ metric, value, allValues });

  const color =
    s.tone === "good"
      ? "text-emerald-700"
      : s.tone === "bad"
      ? "text-rose-600"
      : "text-slate-700";

  const Icon = s.dir === "up" ? ArrowUpRight : s.dir === "down" ? ArrowDownRight : Minus;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-gray-600">{label}</span>
      <span className={clsx("inline-flex items-center gap-1 font-semibold", color)}>
        <Icon size={14} className={clsx(s.dir === "flat" && "opacity-60")} />
        {typeof value === "number" ? fmtNumber(value, 2) : "—"}
      </span>
    </span>
  );
}

export function ActionsAccordion({ tables }: { tables: any }) {
  const persona = Array.isArray(tables.persona_table) ? tables.persona_table : [];
  const promo = Array.isArray(tables.promo_roi) ? tables.promo_roi : [];
  const risk = Array.isArray(tables.discount_risk) ? tables.discount_risk : [];
  const channel = Array.isArray(tables.channel_strategy) ? tables.channel_strategy : [];
  const clv = Array.isArray(tables.clv_summary) ? tables.clv_summary : [];
  const revenue = Array.isArray(tables.revenue_contribution_named) ? tables.revenue_contribution_named : [];
  const rfm = Array.isArray(tables.rfm_summary) ? tables.rfm_summary : [];

  const [open, setOpen] = React.useState<string | null>(null);

  // Mobile-only: which row has its RFM chip expanded
  const [rfmOpen, setRfmOpen] = React.useState<string | null>(null);

  if (!persona.length) return null;

  // global distributions for arrows/colors
  const allR = rfm
    .map((row: unknown) => toNum((row as { Recency_RFM?: unknown } | null | undefined)?.Recency_RFM))
    .filter((v: number | undefined): v is number => typeof v === "number");

  const allF = rfm
    .map((row: unknown) => toNum((row as { Frequency_RFM?: unknown } | null | undefined)?.Frequency_RFM))
    .filter((v: number | undefined): v is number => typeof v === "number");

  const allM = rfm
    .map((row: unknown) => toNum((row as { Monetary_RFM?: unknown } | null | undefined)?.Monetary_RFM))
    .filter((v: number | undefined): v is number => typeof v === "number");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-semibold text-gray-900">Recommended Actions by Cluster</div>

      <div className="mt-3 space-y-2">
        {persona.map((p: any) => {
          const name = p?.Cluster_Name;

          const promoRow = promo.find((x: any) => x?.Cluster_Name === name);
          const riskRow = risk.find((x: any) => x?.Cluster_Name === name);
          const channelRow = channel.find((x: any) => x?.Cluster_Name === name);
          const clvRow = clv.find((x: any) => x?.Cluster_Name === name);
          const revRow = revenue.find((x: any) => x?.Cluster_Name === name);
          const rfmRow = rfm.find((x: any) => x?.Cluster_Name === name);

          const bullets = toActionBullets({ personaRow: p, promoRow, riskRow, channelRow });

          const promoRate = Number(promoRow?.Promo_Response_Rate);
          const riskRate = Number(riskRow?.Discount_Addicted_Rate);

          const revenueClass = "text-sky-700";
          const promoClass =
            Number.isFinite(promoRate) && promoRate >= 0.25 ? "text-emerald-700" : "text-gray-900";
          const riskClass =
            Number.isFinite(riskRate) && riskRate >= 0.1 ? "text-rose-600" : "text-gray-900";
          const clvClass = "text-violet-700";

          const isOpen = open === name;
          const isRfmOpen = rfmOpen === name;

          const R = toNum(rfmRow?.Recency_RFM);
          const F = toNum(rfmRow?.Frequency_RFM);
          const M = toNum(rfmRow?.Monetary_RFM);

          const dotTone = rfmDotTone({ r: R, f: F, m: M, allR, allF, allM });
          const dotClass =
            dotTone === "good"
              ? "bg-emerald-600"
              : dotTone === "bad"
              ? "bg-rose-600"
              : "bg-gray-300";

          return (
            <div key={name} className="rounded-xl border border-gray-200 overflow-hidden">
              {/*  FIX: outer is no longer a <button> to avoid nested button */}
              <div
                role="button"
                tabIndex={0}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer select-none"
                onClick={() => setOpen(isOpen ? null : name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(isOpen ? null : name);
                  }
                }}
              >
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900">{name}</div>
                  <div className="text-xs text-gray-700 line-clamp-1">{p?.Key_Traits ?? ""}</div>
                </div>

                {/* RIGHT: Desktop unchanged. Mobile: RFM chip + dot + View/Hide */}
                <div className="flex items-center gap-3">
                  {/* Desktop (UNCHANGED) */}
                  <div className="hidden sm:flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="font-semibold text-gray-900">RFM</span>
                      <RfmValue label="R" metric="R" value={R} allValues={allR} />
                      <RfmValue label="F" metric="F" value={F} allValues={allF} />
                      <RfmValue label="M" metric="M" value={M} allValues={allM} />
                    </div>
                    <div className="text-[11px] text-gray-500">R↓ better · F/M↑ better</div>
                  </div>

                  {/* Mobile-only RFM chip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRfmOpen((cur) => (cur === name ? null : name));
                    }}
                    className="sm:hidden inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                    aria-label="Toggle RFM details"
                  >
                    <span className={clsx("inline-flex h-2 w-2 rounded-full", dotClass)} />
                    RFM
                    <ChevronDown
                      size={14}
                      className={clsx("transition-transform", isRfmOpen ? "rotate-180" : "rotate-0")}
                    />
                  </button>

                  <div className="text-xs text-gray-700">{isOpen ? "Hide" : "View"}</div>
                </div>
              </div>

              {/* Mobile-only RFM details (outside main collapsible) */}
              {isRfmOpen ? (
                <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <span className="font-semibold text-gray-900">RFM</span>
                    <RfmValue label="R" metric="R" value={R} allValues={allR} />
                    <RfmValue label="F" metric="F" value={F} allValues={allF} />
                    <RfmValue label="M" metric="M" value={M} allValues={allM} />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    R↓ better (more recent) · F/M↑ better (more loyal/value)
                  </div>
                </div>
              ) : null}

              {isOpen ? (
                <div className="px-4 pb-4">
                  <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-700">Revenue %</div>
                      <div className={clsx("mt-1 text-sm font-semibold", revenueClass)}>
                        {fmtNumber(revRow?.["Revenue_%"], 2)}%
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-700">Promo response</div>
                      <div className={clsx("mt-1 text-sm font-semibold", promoClass)}>
                        {pct(promoRow?.Promo_Response_Rate, 1)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-700">Discount addicted</div>
                      <div className={clsx("mt-1 text-sm font-semibold", riskClass)}>
                        {pct(riskRow?.Discount_Addicted_Rate, 1)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-700">Avg CLV proxy</div>
                      <div className={clsx("mt-1 text-sm font-semibold", clvClass)}>
                        {fmtNumber(clvRow?.Avg_CLV_Proxy, 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-900">Actions</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-900 space-y-1">
                      {bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
