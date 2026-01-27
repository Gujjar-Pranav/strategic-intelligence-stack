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
  const parts = text.split(/(\-?\d+(?:,\d{3})*(?:\.\d+)?)/g);

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
        {/* ✅ only number parts colored */}
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
        value={value as any}
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

  const [ttl, setTtl] = React.useState<string>("30m");
  const [sampleSize, setSampleSize] = React.useState<number>(1200);

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

  const loadDemo = async () => {
    setMode("demo");
    setRunId("demo");
    setActiveTab("overview");
  };

  /** Derived */
  const statusText =
    mode === "demo" ? "Demo ready" : mode === "upload" ? "Upload ready" : "Ready";

  const runCardPrimary = mode === "demo" ? "demo" : runId ? runId : "—";

  const uploadRevenueProxy =
    manifest?.dataset?.revenue_proxy ??
    manifest?.dataset?.revenue_col_used ??
    "Total_Spend";

  const tables = getTables(mode, demoClusterInsightsQ.data, manifestRaw);
  const decisionBanner = buildDecisionBanner({ tables });
  const actionTiles = buildActionTiles({ tables });

  /** Tabs */
  const tabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
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
        );

      case "segments":
        return <SegmentsTab tables={tables} />;

      case "tables":
        return <TablesTab tables={tables} />;

      case "simulation":
        return <Simulation mode={mode} tables={tables} />;

      case "exports":
        return (
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
        );

      default:
        return null;
    }
  };

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
        {/* Header */}
        <Header
          onLoadDemo={loadDemo}
          onFileSelected={(file) => uploadMut.mutate(file)}
        />

        {/* ONE compact premium strip */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: compact inputs */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <MiniInput
                label="TTL"
                hint="auto delete"
                value={ttl}
                onChange={(v) => setTtl(v)}
                type="text"
              />
              <MiniInput
                label="Sample"
                hint="preview"
                value={sampleSize}
                onChange={(v) => setSampleSize(Number(v || 0))}
                type="number"
              />
            </div>

            {/* Right: context pills */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Pill
                label="Run"
                value={runCardPrimary}
                sub={mode === "idle" ? "mode: —" : `mode: ${mode}`}
              />

              <Pill
                label="Revenue"
                value={mode === "demo" ? "Total_Spend" : String(uploadRevenueProxy)}
              />

              <Pill
                label="Status"
                value={uploadMut.isPending ? "Uploading…" : statusText}
                sub="Backend: 8000"
                right={
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "inline-flex h-2.5 w-2.5 rounded-full",
                        statusDotClass,
                      ].join(" ")}
                    />
                    <span className="text-xs font-semibold text-gray-600">
                      {uploadMut.isError
                        ? "Error"
                        : uploadMut.isPending
                        ? "Working"
                        : "OK"}
                    </span>
                  </div>
                }
              />
            </div>
          </div>

          {uploadMut.isError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Upload failed:{" "}
              {(uploadMut.error as any)?.message || "unknown error"}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-4">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-6 border-t border-gray-100 pt-6">
            {tabContent()}
          </div>
        </div>
      </div>
    </main>
  );
}
