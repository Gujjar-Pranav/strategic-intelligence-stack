"use client";

import React from "react";
import { ActionTilesSection } from "./ActionTiles";
import { SegmentCompare } from "./SegmentCompare";
import { ActionsAccordion } from "./ActionsAccordion";
import { TopSegmentSpotlight } from "./TopSegmentSpotlight";
import { BICharts } from "../charts/BICharts";
import { fmtNumber, pct, copyText } from "../utils";
import { DecisionBanner } from "./DecisionBanner";

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-gray-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-gray-600">{hint}</div> : null}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-600">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function Overview({
  mode,
  forExport,
  tables,
  decisionBanner,
  actionTiles,
  demoInsightsQ,
  demoClusterInsightsQ,
  manifestQ,
  manifestRaw,
  manifest,
}: {
  mode: "idle" | "demo" | "upload";
  forExport?: boolean;
  tables: any;
  decisionBanner: string;
  actionTiles: { title: string; bold: string; sub: string }[];
  demoInsightsQ: { isLoading: boolean; isError: boolean; data?: any };
  demoClusterInsightsQ: { isLoading: boolean; isError: boolean; data?: any };
  manifestQ: { isLoading: boolean; isError: boolean };
  manifestRaw: any;
  manifest: any;
}) {
  if (mode === "idle") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="text-sm font-semibold text-gray-900">No run loaded</div>
        <div className="mt-2 text-sm text-gray-700">
          Click <b>Load Demo</b> or <b>Upload File</b> to generate a run.
        </div>
      </div>
    );
  }

  /** ---------- DEMO ---------- */
  if (mode === "demo") {
    if (demoInsightsQ.isLoading || demoClusterInsightsQ.isLoading) {
      return <div className="text-sm text-gray-900">Loading BI…</div>;
    }
    if (demoInsightsQ.isError || demoClusterInsightsQ.isError) {
      return <div className="text-sm text-red-600">Failed to load demo BI endpoints.</div>;
    }

    const demoKpis = demoInsightsQ.data?.insights?.kpis ?? {};
    const demoTotalCustomers = demoKpis.total_customers ?? "—";
    const demoTotalRevenue = demoKpis.total_revenue ?? "—";
    const demoAvgSpend = demoKpis.avg_spend_per_customer ?? "—";
    const demoPromoResponse = demoKpis.promo_response_rate ?? "—";
    const demoDiscountAddicted = demoKpis.discount_addicted_rate ?? "—";

    return (
      <div className="space-y-6">
        {/* Executive row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT: decision + tiles + compare */}
          <div className="lg:col-span-7 space-y-4">
            <DecisionBanner decisionBanner={decisionBanner} />
            <ActionTilesSection tiles={actionTiles} />
            <SegmentCompare tables={tables} />
          </div>

          {/* RIGHT: spotlight + KPI strip */}
          <div className="lg:col-span-5 space-y-4">
            <TopSegmentSpotlight tables={tables} />

            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Total customers" value={fmtNumber(demoTotalCustomers, 0)} />
              <KpiCard label="Total revenue" value={fmtNumber(demoTotalRevenue, 0)} />
              <KpiCard label="Avg spend / customer" value={fmtNumber(demoAvgSpend, 2)} />
              <KpiCard label="Promo response" value={pct(demoPromoResponse, 1)} />
              <KpiCard label="Discount addicted" value={pct(demoDiscountAddicted, 1)} />
              <KpiCard label="Clusters" value={String(demoClusterInsightsQ.data?.k ?? 4)} />
            </div>
          </div>
        </div>

        {/* Actions deep dive */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            title="Recommended Actions"
            subtitle="Cluster-by-cluster decisions with key metrics and guardrails."
          />
          <div className="mt-4">
            <ActionsAccordion tables={tables} />
          </div>
        </div>

        {/* Visuals */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            title="BI Visuals"
            subtitle="Fast insights: contribution, responsiveness, risk, channel strategy (plus advanced)."
          />
          <div className="mt-4">
            <BICharts tables={tables} />
          </div>
        </div>

        {!forExport ? (
          <div className="text-xs text-gray-600">
            Demo mode uses <code>/api/demo/insights</code> + <code>/api/demo/clusters/insights</code>.
          </div>
        ) : null}
      </div>
    );
  }

  /** ---------- UPLOAD ---------- */
  if (manifestQ.isLoading) return <div className="text-sm text-gray-900">Loading manifest…</div>;
  if (manifestQ.isError) return <div className="text-sm text-red-600">Failed to load manifest.</div>;
  if (!manifest?.run) return <div className="text-sm text-gray-900">Manifest response shape unexpected.</div>;

  return (
    <div className="space-y-6">
      {/* Executive row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <DecisionBanner decisionBanner={decisionBanner} />

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <SectionHeader
              title="Run metadata"
              subtitle="Model + feature set used for this run."
              right={
                !forExport ? (
                  <button
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 hover:bg-gray-50"
                    onClick={async () => {
                      const ok = await copyText(JSON.stringify(manifestRaw, null, 2));
                      alert(ok ? "Copied manifest JSON ✅" : "Copy failed ❌");
                    }}
                  >
                    Copy manifest JSON
                  </button>
                ) : null
              }
            />
            <div className="mt-3 space-y-2 text-sm text-gray-900">
              <div>
                <b>Model:</b> v{manifest.model?.version} · k={manifest.model?.k} · scaler={manifest.model?.selected_scaler}
              </div>
              <div className="text-gray-900">
                <b>Final features:</b> {manifest.model?.final_features?.join(", ")}
              </div>
              <div className="text-gray-900">
                <b>Created:</b> {manifest.run?.created_at_utc}
              </div>
            </div>
          </div>

          {tables?.persona_table ? (
            <>
              <ActionTilesSection tiles={actionTiles} />
              <SegmentCompare tables={tables} />
            </>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-900">
              Upload run loaded. (To enable BI tables + personas, ensure manifest includes <code>tables</code>.)
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <TopSegmentSpotlight tables={tables} />

          {/* Optional: “quick status” cards from manifest if you want later.
              For now we keep the right side clean and premium. */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <SectionHeader title="What to do next" subtitle="Use Segments + Tables to operationalize campaigns." />
            <div className="mt-3 text-sm text-gray-900 space-y-2">
              <div>• Open <b>Segments</b> to see persona + recommended actions.</div>
              <div>• Use <b>Tables</b> for micro-visuals, search & export.</div>
              <div>• Try <b>Simulation</b> to quantify budget shifts.</div>
            </div>
          </div>
        </div>
      </div>

      {tables?.persona_table ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <SectionHeader
              title="Recommended Actions"
              subtitle="Cluster-by-cluster decisions with guardrails."
            />
            <div className="mt-4">
              <ActionsAccordion tables={tables} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <SectionHeader
              title="BI Visuals"
              subtitle="Contribution, responsiveness, risk, channel strategy (plus advanced)."
            />
            <div className="mt-4">
              <BICharts tables={tables} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
