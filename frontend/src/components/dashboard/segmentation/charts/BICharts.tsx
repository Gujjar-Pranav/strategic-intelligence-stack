"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  type TooltipProps,
} from "recharts";
import { COLORS } from "../constants";
import { ChartCard } from "./ChartCard";

type UnknownRecord = Record<string, unknown>;
type Row = Record<string, unknown> & { Cluster_Name?: string };

function safeNum(x: unknown) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function max(nums: number[]) {
  if (!nums.length) return 0;
  return Math.max(...nums);
}

function KpiChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px]">
      <span className="text-gray-500 font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="ml-2 font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function KpiRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

type MqlLegacy = MediaQueryList & {
  addListener?: (
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void
  ) => void;
  removeListener?: (
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void
  ) => void;
};

function useIsPrintMode(printModeProp?: boolean) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  React.useEffect(() => {
    if (typeof printModeProp === "boolean") {
      setIsPrinting(printModeProp);
      return;
    }

    const hasPrintParam =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("print") === "1";

    if (hasPrintParam) {
      setIsPrinting(true);
      return;
    }

    if (typeof window !== "undefined" && "matchMedia" in window) {
      const mql = window.matchMedia("print") as MqlLegacy;
      const onChange = () => setIsPrinting(!!mql.matches);
      onChange();

      try {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      } catch {
        mql.addListener?.(onChange);
        return () => mql.removeListener?.(onChange);
      }
    }
  }, [printModeProp]);

  return isPrinting;
}

function isRowArray(v: unknown): v is Row[] {
  return Array.isArray(v);
}

function getRows(t: UnknownRecord, key: string): Row[] {
  const v = t[key];
  return isRowArray(v) ? v : [];
}

function truncateLabel(v: unknown, maxLen: number) {
  const s = String(v ?? "");
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

function makeXTicker(isPrintMode: boolean) {
  const maxLen = isPrintMode ? 16 : 22;

  return function XTick(props: unknown) {
    const p = props as {
      x?: number;
      y?: number;
      payload?: { value?: unknown };
    };

    const x = typeof p.x === "number" ? p.x : 0;
    const y = typeof p.y === "number" ? p.y : 0;
    const label = truncateLabel(p.payload?.value, maxLen);

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="end"
          fill="#000000"
          transform={`rotate(${isPrintMode ? -18 : -22})`}
          style={{ fontSize: isPrintMode ? 9 : 10 }}
        >
          {label}
        </text>
      </g>
    );
  };
}

function makeTooltipProps(isPrintMode: boolean) {
  const tooltipCursor = { fill: "rgba(15, 23, 42, 0.06)" };

  const tooltipContentStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderColor: "rgba(226, 232, 240, 1)",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 12,
    boxShadow: "0 10px 20px rgba(2, 6, 23, 0.08)",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    color: "#000000",
  };

  const tooltipLabelStyle: React.CSSProperties = {
    color: "#000000",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
  };

  const tooltipItemStyle: React.CSSProperties = {
    color: "#000000",
    fontSize: 12,
    fontWeight: 500,
    paddingTop: 2,
    paddingBottom: 2,
  };

  const formatter: TooltipProps<number, string>["formatter"] = (value, name) => {
    const n = Number(value);
    const v = Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value ?? "—");
    return [v, String(name ?? "")];
  };

  if (isPrintMode) {
    const content: TooltipProps<number, string>["content"] = () => null;
    return { content } as const;
  }

  return {
    cursor: tooltipCursor,
    contentStyle: tooltipContentStyle,
    labelStyle: tooltipLabelStyle,
    itemStyle: tooltipItemStyle,
    formatter,
  } as const;
}

export function BICharts({
  tables,
  printMode,
}: {
  tables: UnknownRecord;
  printMode?: boolean;
}) {
  const isPrintMode = useIsPrintMode(printMode);
  const t: UnknownRecord = tables ?? {};

  const revenue = getRows(t, "revenue_contribution_named");
  const promo = getRows(t, "promo_roi");
  const risk = getRows(t, "discount_risk");
  const channel = getRows(t, "channel_strategy");

  const revenueChart = revenue.map((r) => ({
    cluster: String(r.Cluster_Name ?? ""),
    revenue_pct: safeNum(r["Revenue_%"]),
    customer_pct: safeNum(r["Customer_%"]),
  }));

  const promoChart = [...promo]
    .map((r) => ({
      cluster: String(r.Cluster_Name ?? ""),
      promo_response: safeNum(r.Promo_Response_Rate) * 100,
    }))
    .sort((a, b) => b.promo_response - a.promo_response);

  const riskChart = [...risk]
    .map((r) => ({
      cluster: String(r.Cluster_Name ?? ""),
      discount_addicted: safeNum(r.Discount_Addicted_Rate) * 100,
    }))
    .sort((a, b) => b.discount_addicted - a.discount_addicted);

  const channelChart = channel.map((r) => ({
    cluster: String(r.Cluster_Name ?? ""),
    web: safeNum(r.Web_Purchase_Ratio) * 100,
    store: safeNum(r.Store_Purchase_Ratio) * 100,
    catalog: safeNum(r.Catalog_Purchase_Ratio) * 100,
  }));

  const revVals = revenueChart.map((d) => d.revenue_pct);
  const custVals = revenueChart.map((d) => d.customer_pct);
  const promoVals = promoChart.map((d) => d.promo_response);
  const riskVals = riskChart.map((d) => d.discount_addicted);
  const webVals = channelChart.map((d) => d.web);
  const storeVals = channelChart.map((d) => d.store);
  const catalogVals = channelChart.map((d) => d.catalog);

  const xTick = makeXTicker(isPrintMode);
  const tooltipProps = makeTooltipProps(isPrintMode);

  // ✅ Keep your existing behavior:
  // - print: fixed chart area
  // - non-print: responsive full-height (ChartCard controls it)
  const nonPrintHeight: number | `${number}%` = "100%";

  // ✅ PDF stability:
  // - these are the container heights that give Recharts a measurable box
  const PRINT_CHART_PX = 260;
  const PRINT_CONTAINER_STYLE: React.CSSProperties = {
    height: PRINT_CHART_PX,
    width: "100%",
  };

  const chartMargin = isPrintMode
    ? { left: 6, right: 6, bottom: 26 }
    : { left: 10, right: 10, bottom: 40 };

  const xAxisHeight = isPrintMode ? 52 : 70;
  const commonBarProps = { isAnimationActive: !isPrintMode };

  return (
    <>
      {/* Print-only CSS to prevent splitting and to force 1-column layout in PDF */}
      <style jsx global>{`
        @media print {
          .bi-charts-grid {
            grid-template-columns: 1fr !important;
          }
          .bi-chart-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bi-charts-grid grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="bi-chart-item">
          <ChartCard
            title="Revenue Share vs Customer Share"
            subtitle="Profit engine vs volume engine"
            meta={
              <KpiRow>
                <KpiChip label="Rev max" value={`${max(revVals).toFixed(1)}%`} />
                <KpiChip label="Rev avg" value={`${avg(revVals).toFixed(1)}%`} />
                <KpiChip
                  label="Cust max"
                  value={`${max(custVals).toFixed(1)}%`}
                />
                <KpiChip
                  label="Cust avg"
                  value={`${avg(custVals).toFixed(1)}%`}
                />
              </KpiRow>
            }
          >
            <div style={isPrintMode ? PRINT_CONTAINER_STYLE : undefined}>
              <ResponsiveContainer
                width="100%"
                height={isPrintMode ? "100%" : nonPrintHeight}
              >
                <BarChart data={revenueChart} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cluster"
                    height={xAxisHeight}
                    tick={xTick}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <YAxis
                    tick={{ fontSize: isPrintMode ? 10 : 12, fill: "#000000" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <Tooltip {...tooltipProps} />
                  <Bar
                    dataKey="revenue_pct"
                    name="Revenue"
                    fill={COLORS.blue}
                    radius={[8, 8, 0, 0]}
                    {...commonBarProps}
                  />
                  <Bar
                    dataKey="customer_pct"
                    name="Customers"
                    fill={COLORS.purple}
                    radius={[8, 8, 0, 0]}
                    {...commonBarProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="bi-chart-item">
          <ChartCard
            title="Promo Response by Cluster"
            subtitle="Target promos where response is highest"
            meta={
              <KpiRow>
                <KpiChip label="Max" value={`${max(promoVals).toFixed(1)}%`} />
                <KpiChip label="Avg" value={`${avg(promoVals).toFixed(1)}%`} />
                <KpiChip label="Sorted" value="High → Low" />
              </KpiRow>
            }
          >
            <div style={isPrintMode ? PRINT_CONTAINER_STYLE : undefined}>
              <ResponsiveContainer
                width="100%"
                height={isPrintMode ? "100%" : nonPrintHeight}
              >
                <BarChart data={promoChart} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cluster"
                    height={xAxisHeight}
                    tick={xTick}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <YAxis
                    tick={{ fontSize: isPrintMode ? 10 : 12, fill: "#000000" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <Tooltip {...tooltipProps} />
                  <Bar
                    dataKey="promo_response"
                    name="Promo response"
                    fill={COLORS.emerald}
                    radius={[8, 8, 0, 0]}
                    {...commonBarProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="bi-chart-item">
          <ChartCard
            title="Discount Addiction Risk"
            subtitle="Apply guardrails to high-risk cohorts"
            meta={
              <KpiRow>
                <KpiChip label="Max" value={`${max(riskVals).toFixed(1)}%`} />
                <KpiChip label="Avg" value={`${avg(riskVals).toFixed(1)}%`} />
                <KpiChip label="Sorted" value="High → Low" />
              </KpiRow>
            }
          >
            <div style={isPrintMode ? PRINT_CONTAINER_STYLE : undefined}>
              <ResponsiveContainer
                width="100%"
                height={isPrintMode ? "100%" : nonPrintHeight}
              >
                <BarChart data={riskChart} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cluster"
                    height={xAxisHeight}
                    tick={xTick}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <YAxis
                    tick={{ fontSize: isPrintMode ? 10 : 12, fill: "#000000" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <Tooltip {...tooltipProps} />
                  <Bar
                    dataKey="discount_addicted"
                    name="Discount addicted"
                    fill={COLORS.rose}
                    radius={[8, 8, 0, 0]}
                    {...commonBarProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="bi-chart-item">
          <ChartCard
            title="Channel Strategy Mix"
            subtitle="Where each segment prefers to buy (stacked)"
            meta={
              <KpiRow>
                <KpiChip label="Web avg" value={`${avg(webVals).toFixed(1)}%`} />
                <KpiChip
                  label="Store avg"
                  value={`${avg(storeVals).toFixed(1)}%`}
                />
                <KpiChip
                  label="Catalog avg"
                  value={`${avg(catalogVals).toFixed(1)}%`}
                />
              </KpiRow>
            }
          >
            <div style={isPrintMode ? PRINT_CONTAINER_STYLE : undefined}>
              <ResponsiveContainer
                width="100%"
                height={isPrintMode ? "100%" : nonPrintHeight}
              >
                <BarChart data={channelChart} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="cluster"
                    height={xAxisHeight}
                    tick={xTick}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <YAxis
                    tick={{ fontSize: isPrintMode ? 10 : 12, fill: "#000000" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(226, 232, 240, 1)" }}
                  />
                  <Tooltip {...tooltipProps} />
                  <Bar
                    dataKey="web"
                    name="Web"
                    stackId="a"
                    fill={COLORS.teal}
                    radius={[8, 8, 0, 0]}
                    {...commonBarProps}
                  />
                  <Bar
                    dataKey="store"
                    name="Store"
                    stackId="a"
                    fill={COLORS.amber}
                    {...commonBarProps}
                  />
                  <Bar
                    dataKey="catalog"
                    name="Catalog"
                    stackId="a"
                    fill={COLORS.purple}
                    {...commonBarProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>
    </>
  );
}
