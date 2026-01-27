"use client";

import React from "react";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";
import { Info, SlidersHorizontal } from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import { COLORS } from "../constants";
import { clamp, fmtNumber, getClusterNames } from "../utils";
import { SliderRow } from "./SliderRow";
import { normalizeDemoSummaryLabels, simulateLocalFromTables } from "./simulationAdapters";

type Mode = "idle" | "demo" | "upload";

type SimRecomputeState = {
  source_cluster: string;
  target_cluster: string;
  budget_shift_pct: number;
  uplift_target: number;
  loss_source: number;
};

export function Simulation({ mode, tables }: { mode: Mode; tables: any }) {
  const clusterNames = getClusterNames(tables);

  const [state, setState] = React.useState<SimRecomputeState>(() => ({
    source_cluster: clusterNames.includes("Budget-Conscious Families")
      ? "Budget-Conscious Families"
      : clusterNames[0] ?? "",
    target_cluster: clusterNames.includes("High-Value Loyal Customers")
      ? "High-Value Loyal Customers"
      : clusterNames[1] ?? clusterNames[0] ?? "",
    budget_shift_pct: 0.15,
    uplift_target: 0.05,
    loss_source: 0.02,
  }));

  React.useEffect(() => {
    if (!clusterNames.length) return;
    setState((s) => ({
      ...s,
      source_cluster: clusterNames.includes(s.source_cluster) ? s.source_cluster : (clusterNames[0] ?? ""),
      target_cluster: clusterNames.includes(s.target_cluster) ? s.target_cluster : (clusterNames[1] ?? clusterNames[0] ?? ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterNames.join("|")]);

  const simulateMut = useMutation({
    mutationFn: async (payload: any) => {
      // real-time for demo + upload (same as your working version)
      return simulateLocalFromTables(tables, payload);
    },
  });

  const lastKeyRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!state.source_cluster || !state.target_cluster) return;

    const payload = {
      mode,
      simulation: {
        assumptions: {
          source_cluster: state.source_cluster,
          target_cluster: state.target_cluster,
          budget_shift_pct: state.budget_shift_pct,
          uplift_target: state.uplift_target,
          loss_source: state.loss_source,
          revenue_col_used: "Total_Spend",
          revenue_is_proxy: false,
        },
      },
    };

    const key = JSON.stringify({ mode, ...payload.simulation.assumptions });
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const t = setTimeout(() => simulateMut.mutate(payload), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state]);

  const sim = simulateMut.data?.simulation;
  const rawSummary = Array.isArray(sim?.summary_table) ? sim.summary_table : [];
  const rawChartData = Array.isArray(sim?.chart_data) ? sim.chart_data : [];

  const summary = normalizeDemoSummaryLabels(rawSummary);
  const chartData = rawChartData.map((r: any) => ({ ...r, metric: String(r?.metric ?? "") }));

  const getAmount = (metrics: string | string[]) => {
    const ms = Array.isArray(metrics) ? metrics : [metrics];
    const row = summary.find((r: any) => ms.includes(r.metric));
    return Number(row?.amount);
  };

  const current = getAmount("Current Total Revenue");
  const loss = getAmount(["Revenue Lost (Source Cluster)", "Revenue Lost (Source Segment)"]);
  const gain = getAmount(["Revenue Gained (Target Cluster)", "Revenue Gained (Target Segment)"]);
  const net = getAmount("Net Revenue Impact");
  const netIsNeg = Number.isFinite(net) && net < 0;

  // number-only colors (no layout changes)
  const classCurrent = "text-slate-700";
  const classLoss = "text-rose-600";
  const classGain = "text-emerald-700";

  if (!tables?.persona_table) {
    return (
      <div className="text-sm text-gray-900">
        Simulation requires persona + cluster tables. Load Demo or ensure upload run includes tables.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <SlidersHorizontal size={16} /> Simulation (recompute)
        </div>
        <div className="mt-2 text-xs text-gray-700">
          Auto-recomputes as you adjust. Demo calls <code>/api/demo/simulate</code>. Upload mode uses the uploaded run’s cluster revenues.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-700 mb-2">Source cluster (budget removed)</div>
          <select
            value={state.source_cluster}
            onChange={(e) => setState((s) => ({ ...s, source_cluster: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white text-gray-900"
          >
            {clusterNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-700 mb-2">Target cluster (budget added)</div>
          <select
            value={state.target_cluster}
            onChange={(e) => setState((s) => ({ ...s, target_cluster: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white text-gray-900"
          >
            {clusterNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SliderRow
          label="Budget shift"
          hint="Portion of budget moved from source to target."
          value={state.budget_shift_pct}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => setState((s) => ({ ...s, budget_shift_pct: clamp(v, 0, 0.5) }))}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <SliderRow
          label="Uplift in target"
          hint="Expected conversion / revenue uplift for the target cluster."
          value={state.uplift_target}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => setState((s) => ({ ...s, uplift_target: clamp(v, 0, 0.5) }))}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <SliderRow
          label="Leakage from source"
          hint="Expected loss in source cluster (churn / lower conversion)."
          value={state.loss_source}
          min={0}
          max={0.25}
          step={0.01}
          onChange={(v) => setState((s) => ({ ...s, loss_source: clamp(v, 0, 0.25) }))}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Info size={16} /> Scenario Summary
          </div>
          <div className="mt-2 text-sm text-gray-900">
            Shift{" "}
            <span className="font-semibold text-slate-700">{Math.round(state.budget_shift_pct * 100)}%</span>{" "}
            budget from <b>{state.source_cluster}</b> to{" "}
            <b>{state.target_cluster}</b>.
          </div>
          <div className="mt-1 text-xs text-gray-700">
            Uplift{" "}
            <span className="font-semibold text-emerald-700">{Math.round(state.uplift_target * 100)}%</span>{" "}
            · Leakage{" "}
            <span className="font-semibold text-rose-600">{Math.round(state.loss_source * 100)}%</span>
          </div>

          {simulateMut.isError ? (
            <div className="mt-2 text-xs text-red-600">
              Simulation failed: {(simulateMut.error as any)?.message || "unknown error"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900">Impact KPIs</div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-700">Current total</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              <span className={clsx(Number.isFinite(current) ? classCurrent : "text-gray-900")}>
                {fmtNumber(current, 1)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-700">Loss (source)</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {Number.isFinite(loss) ? (
                <span className={classLoss}>{fmtNumber(loss, 2)}</span>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-700">Gain (target)</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {Number.isFinite(gain) ? (
                <span className={classGain}>{fmtNumber(gain, 2)}</span>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-700">Net impact</div>
            <div className={clsx("mt-1 text-sm font-semibold", netIsNeg ? "text-red-600" : "text-emerald-600")}>
              {Number.isFinite(net) ? fmtNumber(net, 2) : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "#0f172a" }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Value" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
