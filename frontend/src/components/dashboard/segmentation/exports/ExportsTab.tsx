"use client";

import React from "react";
import { FileDown, FileText } from "lucide-react";
import { downloadFile, downloadScoredXlsxByRunId } from "@/lib/api";

import { ExportPdfButton } from "./ExportPdfButton";
import type { ExecExportPayload } from "./exportPayload";

export function ExportsTab({
  mode,
  runId,
  manifestFiles,
  manifestRaw,
  manifest,
  //  add these so PDF export can generate a real exec summary
  decisionBanner,
  actionTiles,
  tables,
}: {
  mode: "idle" | "demo" | "upload";
  runId: string | null;
  manifestFiles: any;
  manifestRaw: any;
  manifest: any;

  decisionBanner: string;
  actionTiles: { title: string; bold: string; sub: string }[];
  tables: any;
}) {
  const pdfPayload: ExecExportPayload | null =
    mode === "demo" || mode === "upload"
      ? {
          mode,
          decisionBanner,
          actionTiles,
          tables,
          manifest,
        }
      : null;

  return (
    <div className="space-y-4">
      {/*  Executive PDF export (works in demo + upload) */}
      {pdfPayload ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={16} /> Executive Summary
          </div>
          <div className="mt-2 text-xs text-gray-700">
            Download a print-ready PDF summary (decision, actions, visuals, appendix tables).
          </div>

          <div className="mt-3">
            <ExportPdfButton payload={pdfPayload} />
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-900">
          Load Demo or Upload a file to enable PDF export.
        </div>
      )}

      {/*  Existing scored.xlsx export (upload only) */}
      {mode === "demo" ? (
        <div className="text-sm text-gray-900">
          Demo mode doesn’t generate <code>scored.xlsx</code>. Use Upload mode for dataset exports.
        </div>
      ) : !runId ? (
        <div className="text-sm text-gray-900">Upload a file first to enable scored.xlsx export.</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileDown size={16} /> Data Export
          </div>
          <div className="mt-2 text-xs text-gray-700">Download scored spreadsheet for this run.</div>
          <button
            className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90"
            onClick={async () => {
              try {
                const scoredPath =
                  manifestFiles?.scored_xlsx ||
                  manifestRaw?.files?.scored_xlsx ||
                  manifest?.files?.scored_xlsx;

                if (scoredPath) await downloadFile(scoredPath, `scored_${runId}.xlsx`);
                else await downloadScoredXlsxByRunId(runId);
              } catch (e: any) {
                alert(e?.message || "Download failed");
              }
            }}
          >
            Download scored.xlsx
          </button>
        </div>
      )}
    </div>
  );
}
