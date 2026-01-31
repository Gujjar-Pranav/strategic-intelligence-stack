"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  uploadRun,
  fetchManifest,
  fetchDemoInsights,
  fetchDemoClusterInsights,
} from "@/lib/api";

import type { Mode, TabKey } from "@/components/dashboard/segmentation/types";
import {
  Header,
  Tabs,
  Overview,
  SegmentsTab,
  TablesTab,
  Simulation,
  ExportsTab,
} from "@/components/dashboard/segmentation";

import {
  normalizeManifest,
  normalizeFiles,
  getTables,
  buildDecisionBanner,
  buildActionTiles,
} from "@/components/dashboard/segmentation/utils";

function ColorNumbers({ value }: { value: React.ReactNode }) {
  if (typeof value !== "string" && typeof value !== "number") return <>{value}</>;

  const text = String(value);

  // ✅ removed useless escape
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

function Pill({
  label,
  value,
  sub,
  right,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </div>
        {sub ? <div className="text-[11px] text-gray-500">{sub}</div> : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-gray-900">
          <ColorNumbers value={value} />
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

function MiniInput({
  label,
  hint,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  hint: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {label}
        </div>
        <div className="text-[11px] text-gray-500">{hint}</div>
      </div>

      <input
        type={type}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-28 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-indigo-600 outline-none focus:border-gray-300"
      />
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = React.useState<Mode>("idle");
  const [runId, setRunId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");

  const [ttl, setTtl] = React.useState("30m");
  const [sampleSize, setSampleSize] = React.useState(1200);

  /** Upload */
  const uploadMut = useMutation({
    mutationFn: async (file: File) =>
      uploadRun({ file, ttl, sample_size: sampleSize }),
    onSuccess: (data) => {
      setMode("upload");
      setRunId(data.run_id);
      setActiveTab("overview");
    },
  });

  const manifestQ = useQuery({
    queryKey: ["manifest", runId],
    queryFn: async () => fetchManifest(runId!),
    enabled: mode === "upload" && !!runId,
  });

  const manifestRaw = manifestQ.data;
  const manifest = normalizeManifest(manifestRaw);
  const manifestFiles = normalizeFiles(manifestRaw);

  /** Demo */
  const demoInsightsQ = useQuery({
    queryKey: ["demoInsights"],
    queryFn: fetchDemoInsights,
    enabled: mode === "demo",
  });

  const demoClusterInsightsQ = useQuery({
    queryKey: ["demoClusterInsights"],
    queryFn: fetchDemoClusterInsights,
    enabled: mode === "demo",
  });

  const loadDemo = () => {
    setMode("demo");
    setRunId("demo");
    setActiveTab("overview");
  };

  /** Derived */
  const statusText =
    mode === "demo" ? "Demo ready" : mode === "upload" ? "Upload ready" : "Ready";

  const runCardPrimary = mode === "demo" ? "demo" : runId ?? "—";

  const uploadRevenueProxy =
    manifest?.dataset?.revenue_proxy ??
    manifest?.dataset?.revenue_col_used ??
    "Total_Spend";

  const tables = getTables(mode, demoClusterInsightsQ.data, manifestRaw);
  const decisionBanner = buildDecisionBanner({ tables });
  const actionTiles = buildActionTiles({ tables });

  const statusDotClass = uploadMut.isPending
    ? "bg-amber-500"
    : uploadMut.isError
    ? "bg-rose-600"
    : mode === "demo" || mode === "upload"
    ? "bg-emerald-600"
    : "bg-gray-300";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Header
          onLoadDemo={loadDemo}
          onFileSelected={(file) => uploadMut.mutate(file)}
        />

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
          {uploadMut.isError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Upload failed:{" "}
              {uploadMut.error instanceof Error
                ? uploadMut.error.message
                : "unknown error"}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-6 border-t border-gray-100 pt-6">
            {activeTab === "overview" && (
              <Overview
                mode={mode}
                tables={tables}
                decisionBanner={decisionBanner}
                actionTiles={actionTiles}
                demoInsightsQ={demoInsightsQ}
                demoClusterInsightsQ={demoClusterInsightsQ}
                manifestQ={manifestQ}
                manifestRaw={manifestRaw}
                manifest={manifest}
              />
            )}
            {activeTab === "segments" && <SegmentsTab tables={tables} />}
            {activeTab === "tables" && <TablesTab tables={tables} />}
            {activeTab === "simulation" && (
              <Simulation mode={mode} tables={tables} />
            )}
            {activeTab === "exports" && (
              <ExportsTab
                mode={mode}
                runId={runId}
                manifestFiles={manifestFiles}
                manifestRaw={manifestRaw}
                manifest={manifest}
                decisionBanner={decisionBanner}
                actionTiles={actionTiles}
                tables={tables}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
