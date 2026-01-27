"use client";

import React from "react";
import { ExecExportPayload } from "./exportPayload";

export function ExportPdfButton({ payload }: { payload: ExecExportPayload }) {
  const [loading, setLoading] = React.useState(false);

  return (
    <button
      disabled={loading}
      className={[
        "rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50",
        loading ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
      onClick={async () => {
        try {
          setLoading(true);

          const res = await fetch("/api/exec-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(msg || `PDF export failed (${res.status})`);
          }

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);

          // Try to extract filename from header, else fallback
          const cd = res.headers.get("content-disposition") || "";
          const match = /filename="([^"]+)"/.exec(cd);
          const filename = match?.[1] || "executive-summary.pdf";

          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();

          window.URL.revokeObjectURL(url);
        } catch (e: any) {
          alert(e?.message ?? "Export failed.");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Generating…" : "Export PDF"}
    </button>
  );
}
