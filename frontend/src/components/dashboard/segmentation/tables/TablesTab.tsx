"use client";

import React from "react";
import clsx from "clsx";
import { DataTable } from "./DataTable";
import { fmtNumber, pct } from "../utils";
import { BarChart3, Flame, ShieldAlert, TrendingUp } from "lucide-react";

type TableDef = {
  key: string;
  title: string;
  rows: any[] | undefined;
  variant: "revenue" | "promo" | "risk" | "channel" | "rfm" | "clv";
  icon: React.ReactNode;
  description?: string;
};

function pickNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bestBy(rows: any[], field: string) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return [...rows].sort((a, b) => (pickNumber(b?.[field]) ?? -Infinity) - (pickNumber(a?.[field]) ?? -Infinity))[0] ?? null;
}

function Card({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-600">{title}</div>
          <div className="mt-1 text-base font-semibold tracking-tight text-gray-900">{value}</div>
          {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
        </div>
        {icon ? <div className="text-gray-700">{icon}</div> : null}
      </div>
    </div>
  );
}

export function TablesTab({ tables }: { tables: any }) {
  const revenue = tables?.revenue_contribution_named;
  const rfm = tables?.rfm_summary;
  const promo = tables?.promo_roi;
  const channel = tables?.channel_strategy;
  const risk = tables?.discount_risk;
  const clv = tables?.clv_summary;

  const tableDefs: TableDef[] = [
    {
      key: "revenue",
      title: "Revenue Contribution by Cluster",
      rows: Array.isArray(revenue) ? revenue : undefined,
      variant: "revenue",
      icon: <TrendingUp size={16} />,
      description: "Share of revenue vs share of customers (micro-bars included).",
    },
    {
      key: "promo",
      title: "Promotion ROI Indicators by Cluster",
      rows: Array.isArray(promo) ? promo : undefined,
      variant: "promo",
      icon: <Flame size={16} />,
      description: "Promo response + deal dependency (micro-bars included).",
    },
    {
      key: "risk",
      title: "Risk Flag: Discount Addiction Index",
      rows: Array.isArray(risk) ? risk : undefined,
      variant: "risk",
      icon: <ShieldAlert size={16} />,
      description: "Discount addiction risk (danger highlighting + micro-bars).",
    },
    {
      key: "channel",
      title: "Channel Strategy Matrix",
      rows: Array.isArray(channel) ? channel : undefined,
      variant: "channel",
      icon: <BarChart3 size={16} />,
      description: "Channel ratios + cluster mini-spark bars.",
    },
    {
      key: "rfm",
      title: "RFM Summary (Behavior)",
      rows: Array.isArray(rfm) ? rfm : undefined,
      variant: "rfm",
      icon: <BarChart3 size={16} />,
      description: "RFM metrics + compact spark bars per cluster.",
    },
    {
      key: "clv",
      title: "Simple Lifetime Value Proxy (CLV-lite)",
      rows: Array.isArray(clv) ? clv : undefined,
      variant: "clv",
      icon: <TrendingUp size={16} />,
      description: "CLV proxy with relative micro-bar per row.",
    },
  ];

  const available = tableDefs.filter((t) => Array.isArray(t.rows) && (t.rows as any[]).length > 0);
  const [activeKey, setActiveKey] = React.useState<string>(() => available[0]?.key ?? "revenue");
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    if (!available.length) return;
    if (!available.some((t) => t.key === activeKey)) setActiveKey(available[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available.map((x) => x.key).join("|")]);

  const topRevenue = bestBy(Array.isArray(revenue) ? revenue : [], "Revenue_%");
  const topPromo = bestBy(Array.isArray(promo) ? promo : [], "Promo_Response_Rate");
  const topRisk = bestBy(Array.isArray(risk) ? risk : [], "Discount_Addicted_Rate");
  const topStore = bestBy(Array.isArray(channel) ? channel : [], "Store_Purchase_Ratio");

  if (!available.length) return <div className="text-sm text-gray-900">No BI tables available.</div>;

  const active = available.find((t) => t.key === activeKey) ?? available[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Top revenue segment"
          value={topRevenue?.Cluster_Name ?? "—"}
          sub={
            topRevenue ? (
              <>
                Revenue share:{" "}
                <span className="font-semibold text-sky-700">{fmtNumber(topRevenue?.["Revenue_%"], 2)}%</span>
              </>
            ) : (
              "—"
            )
          }
          icon={<TrendingUp size={18} />}
        />
        <Card
          title="Best promo responder"
          value={topPromo?.Cluster_Name ?? "—"}
          sub={
            topPromo ? (
              <>
                Promo response:{" "}
                <span className="font-semibold text-emerald-700">{pct(topPromo?.Promo_Response_Rate, 1)}</span>
              </>
            ) : (
              "—"
            )
          }
          icon={<Flame size={18} />}
        />
        <Card
          title="Highest discount risk"
          value={topRisk?.Cluster_Name ?? "—"}
          sub={
            topRisk ? (
              <>
                Discount addicted:{" "}
                <span className="font-semibold text-rose-600">{pct(topRisk?.Discount_Addicted_Rate, 1)}</span>
              </>
            ) : (
              "—"
            )
          }
          icon={<ShieldAlert size={18} />}
        />
        <Card
          title="Store-heavy segment"
          value={topStore?.Cluster_Name ?? "—"}
          sub={
            topStore ? (
              <>
                Store ratio:{" "}
                <span className="font-semibold text-amber-700">{pct(topStore?.Store_Purchase_Ratio, 1)}</span>
              </>
            ) : (
              "—"
            )
          }
          icon={<BarChart3 size={18} />}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold text-gray-900">BI Tables</div>
            <div className="mt-1 text-xs text-gray-600">
              Micro-visuals are built into key columns. Search + export works everywhere.
            </div>
          </div>

          <button
            className={clsx(
              "rounded-full px-3 py-2 text-xs border transition",
              showAll ? "bg-black text-white border-black" : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
            )}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Viewing: All tables" : "Viewing: One table"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {available.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <button
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition",
                  isActive ? "bg-black text-white border-black" : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
                )}
              >
                {t.icon}
                <span className="font-semibold">{t.key.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {!showAll ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <div className="text-sm font-semibold text-gray-900">{active.title}</div>
            {active.description ? <div className="mt-1 text-xs text-gray-600">{active.description}</div> : null}
          </div>
        ) : null}
      </div>

      {showAll ? (
        <div className="space-y-6">
          {available.map((t) => (
            <DataTable key={t.key} title={t.title} rows={t.rows as any[]} variant={t.variant} />
          ))}
        </div>
      ) : (
        <DataTable title={active.title} rows={active.rows as any[]} variant={active.variant} />
      )}
    </div>
  );
}
