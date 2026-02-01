"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fmtNumber, toActionBullets, pickSpotlightCluster } from "../utils";

function MetricChip({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function TopSegmentSpotlight({ tables }: { tables: any }) {
  // ✅ Hooks must be called unconditionally
  const [open, setOpen] = React.useState(true);

  const persona = Array.isArray(tables.persona_table) ? tables.persona_table : [];
  const promo = Array.isArray(tables.promo_roi) ? tables.promo_roi : [];
  const risk = Array.isArray(tables.discount_risk) ? tables.discount_risk : [];
  const channel = Array.isArray(tables.channel_strategy) ? tables.channel_strategy : [];
  const revenue = Array.isArray(tables.revenue_contribution_named)
    ? tables.revenue_contribution_named
    : [];

  if (!revenue.length) return null;

  const spot = pickSpotlightCluster(tables);
  if (!spot?.Cluster_Name) return null;

  const name = spot.Cluster_Name;
  const personaRow = persona.find((x: any) => x?.Cluster_Name === name);
  const promoRow = promo.find((x: any) => x?.Cluster_Name === name);
  const riskRow = risk.find((x: any) => x?.Cluster_Name === name);
  const channelRow = channel.find((x: any) => x?.Cluster_Name === name);

  const bullets = toActionBullets({ personaRow, promoRow, riskRow, channelRow });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {/* ONE LINE HEADER */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: title + hide */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Top Segment Spotlight
            </div>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-50"
            >
              {open ? "Hide" : "View"}
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="mt-2 truncate text-lg font-semibold tracking-tight text-gray-900">
            {name}
          </div>

          <div className="mt-1 text-sm text-gray-600">
            Picks <b className="text-gray-900">High-Value Loyal Customers</b> if present,
            otherwise highest revenue share.
          </div>
        </div>

        {/* Right: vertical metrics (column) */}
        <div className="flex flex-col gap-2 shrink-0">
          <MetricChip
            label="Revenue %"
            value={
              <span className="font-semibold text-emerald-600">
                {fmtNumber(spot["Revenue_%"], 2)}%
              </span>
            }
          />
          <MetricChip
            label="Customers %"
            value={
              <span className="font-semibold text-blue-600">
                {fmtNumber(spot["Customer_%"], 2)}%
              </span>
            }
          />
        </div>
      </div>

      {/* Collapsible content */}
      {open ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Recommended moves</div>
            <div className="text-xs text-gray-500">
              {bullets.length ? `${bullets.length} items` : "—"}
            </div>
          </div>

          {bullets.length ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-900 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="leading-relaxed">
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-sm text-gray-700">No recommendations available.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
