"use client";

import React from "react";
import clsx from "clsx";
import { Upload, FileDown, Copy, Circle } from "lucide-react";
import { fmtNumber } from "../utils";

export function CommandBar({
  mode,
  runId,
  statusText,
  ttl,
  setTtl,
  sampleSize,
  setSampleSize,
  rows,
  clusters,
  revenueProxy,
  onLoadDemo,
  onUploadClick,
  onDownloadScored,
  canDownloadScored,
}: {
  mode: "idle" | "demo" | "upload";
  runId: string | null;
  statusText: string;
  ttl: string;
  setTtl: (v: string) => void;
  sampleSize: number;
  setSampleSize: (v: number) => void;
  rows: any;
  clusters: any;
  revenueProxy: any;

  onLoadDemo: () => void;
  onUploadClick: () => void;

  onDownloadScored?: () => Promise<void>;
  canDownloadScored?: boolean;
}) {
  const pill = (label: string, value: React.ReactNode) => (
    <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 flex items-center gap-2">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );

  const shortRun =
    mode === "demo" ? "demo" : runId ? runId.slice(0, 10) + "…" : "—";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: run + system pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
            <Circle
              size={10}
              className={clsx(
                "fill-current",
                mode === "demo"
                  ? "text-emerald-500"
                  : mode === "upload"
                  ? "text-blue-500"
                  : "text-gray-400"
              )}
            />
            <div className="text-xs text-gray-700">{statusText}</div>
            <div className="text-xs font-semibold text-gray-900">
              · {mode === "idle" ? "—" : mode}
            </div>
          </div>

          {pill("Run", shortRun)}
          {pill("Rows", fmtNumber(rows, 0))}
          {pill("Clusters", String(clusters ?? "—"))}
          {pill("Revenue", String(revenueProxy ?? "—"))}
        </div>

        {/* Right: controls + CTAs */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
            <div className="text-[11px] text-gray-600">TTL</div>
            <input
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              className="w-20 bg-transparent text-sm text-gray-900 outline-none"
            />
            <div className="mx-2 h-5 w-px bg-gray-200" />
            <div className="text-[11px] text-gray-600">Sample</div>
            <input
              type="number"
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value || 0))}
              className="w-24 bg-transparent text-sm text-gray-900 outline-none"
            />
          </div>

          <button
            onClick={onLoadDemo}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
          >
            Load Demo
          </button>

          <button
            onClick={onUploadClick}
            className="rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90 inline-flex items-center gap-2"
          >
            <Upload size={16} />
            Upload
          </button>

          {canDownloadScored && onDownloadScored ? (
            <button
              onClick={() => onDownloadScored()}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <FileDown size={16} />
              scored.xlsx
            </button>
          ) : null}

          {runId ? (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(runId);
                } catch (err) {

                  console.debug("Clipboard write failed", err);
                }
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 inline-flex items-center gap-2"
              title="Copy run id"
            >
              <Copy size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
