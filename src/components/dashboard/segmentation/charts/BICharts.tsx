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
} from "recharts";
import { COLORS } from "../constants";
import { ChartCard } from "./ChartCard";

function safeNum(x: any) {
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
      const mql = window.matchMedia("print");
      const onChange = () => setIsPrinting(!!mql.matches);
      onChange();

      try {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      } catch {
        // Safari fallback
        // @ts-ignore
        mql.addListener(onChange);
        // @ts-ignore
        return () => mql.removeListener(onChange);
      }
    }
  }, [printModeProp]);

  return isPrinting;
}

export function BICharts({
  tables,
  printMode,
}: {
  tables: any;
  printMode?: boolean;
}) {
  const isPrintMode = useIsPrintMode(printMode);

  const t = tables ?? {};

  const revenue = Array.isArray(t?.revenue_contribution_named)
    ? t.revenue_contribution_named
    : [];
  const promo = Array.isArray(t?.promo_roi) ? t.promo_roi : [];
  const risk = Array.isArray(t?.discount_risk) ? t.discount_risk : [];
  const channel = Array.isArray(t?.channel_strategy) ? t.channel_strategy : [];

  const revenueChart = revenue.map((r: any) => ({
    cluster: r.Cluster_Name,
    revenue_pct: safeNum(r["Revenue_%"]),
    customer_pct: safeNum(r["Customer_%"]),
  }));

  const promoChart = [...promo]
    .map((r: any) => ({
      cluster: r.Cluster_Name,
      promo_response: safeNum(r.Promo_Response_Rate) * 100,
    }))
    .sort((a, b) => b.promo_response - a.promo_response);

  const riskChart = [...risk]
    .map((r: any) => ({
      cluster: r.Cluster_Name,
      discount_addicted: safeNum(r.Discount_Addicted_Rate) * 100,
    }))
    .sort((a, b) => b.discount_addicted - a.discount_addicted);

  const channelChart = channel.map((r: any) => ({
    cluster: r.Cluster_Name,
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

  const xTick = (props: any) => {
    const { x, y, payload } = props;
    const v = String(payload.value ?? "");
    const trimmed = v.length > (isPrintMode ? 16 : 22) ? v.slice(0, isPrintMode ? 16 : 22) + "…" : v;

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
          {trimmed}
        </text>
      </g>
    );
  };

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

  const tooltipFormatter = (value: any, name: any) => {
    const n = Number(value);
    const v = Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value ?? "—");
    return [v, String(name ?? "")];
  };

  // Tighter in PDF so 4 charts fit
  const chartHeight = isPrintMode ? 180 : "100%";

  const tooltipProps = isPrintMode
    ? { content: () => null }
    : {
        cursor: tooltipCursor,
        contentStyle: tooltipContentStyle,
        labelStyle: tooltipLabelStyle,
        itemStyle: tooltipItemStyle,
        formatter: tooltipFormatter,
      };

  const commonBarProps = {
    isAnimationActive: !isPrintMode,
  };

  const chartMargin = isPrintMode ? { left: 6, right: 6, bottom: 26 } : { left: 10, right: 10, bottom: 40 };
  const xAxisHeight = isPrintMode ? 52 : 70;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Revenue Share vs Customer Share"
        subtitle="Profit engine vs volume engine"
        meta={
          <KpiRow>
            <KpiChip label="Rev max" value={`${max(revVals).toFixed(1)}%`} />
            <KpiChip label="Rev avg" value={`${avg(revVals).toFixed(1)}%`} />
            <KpiChip label="Cust max" value={`${max(custVals).toFixed(1)}%`} />
            <KpiChip label="Cust avg" value={`${avg(custVals).toFixed(1)}%`} />
          </KpiRow>
        }
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
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
            <Tooltip {...(tooltipProps as any)} />
            <Bar dataKey="revenue_pct" name="Revenue" fill={COLORS.blue} radius={[8, 8, 0, 0]} {...commonBarProps} />
            <Bar dataKey="customer_pct" name="Customers" fill={COLORS.purple} radius={[8, 8, 0, 0]} {...commonBarProps} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

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
        <ResponsiveContainer width="100%" height={chartHeight}>
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
            <Tooltip {...(tooltipProps as any)} />
            <Bar dataKey="promo_response" name="Promo response" fill={COLORS.emerald} radius={[8, 8, 0, 0]} {...commonBarProps} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

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
        <ResponsiveContainer width="100%" height={chartHeight}>
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
            <Tooltip {...(tooltipProps as any)} />
            <Bar dataKey="discount_addicted" name="Discount addicted" fill={COLORS.rose} radius={[8, 8, 0, 0]} {...commonBarProps} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Channel Strategy Mix"
        subtitle="Where each segment prefers to buy (stacked)"
        meta={
          <KpiRow>
            <KpiChip label="Web avg" value={`${avg(webVals).toFixed(1)}%`} />
            <KpiChip label="Store avg" value={`${avg(storeVals).toFixed(1)}%`} />
            <KpiChip label="Catalog avg" value={`${avg(catalogVals).toFixed(1)}%`} />
          </KpiRow>
        }
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
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
            <Tooltip {...(tooltipProps as any)} />
            <Bar dataKey="web" name="Web" stackId="a" fill={COLORS.teal} radius={[8, 8, 0, 0]} {...commonBarProps} />
            <Bar dataKey="store" name="Store" stackId="a" fill={COLORS.amber} {...commonBarProps} />
            <Bar dataKey="catalog" name="Catalog" stackId="a" fill={COLORS.purple} {...commonBarProps} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
