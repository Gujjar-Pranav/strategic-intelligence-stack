// src/lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

type FetchOpts = RequestInit & { parseAs?: "json" | "blob" };

async function http<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || "request failed"}`);
  }

  const parseAs = opts.parseAs ?? "json";
  if (parseAs === "blob") return (await res.blob()) as any;
  return (await res.json()) as T;
}

/** ---------- Downloads ---------- **/

export async function downloadFile(pathOrUrl: string, filename: string) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${API_BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

  const blob = await http<Blob>(url, { parseAs: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** ---------- Upload / Runs ---------- **/

export type UploadRunResponse = {
  run_id: string;
  expires_at_utc?: string;
  files?: {
    manifest?: string;
    scored_xlsx?: string;
  };
  manifest?: any;
};

export async function uploadRun(params: {
  file: File;
  ttl?: string; // e.g. "30m"
  sample_size?: number;
}): Promise<UploadRunResponse> {
  const form = new FormData();
  form.append("file", params.file);
  if (params.ttl) form.append("ttl", params.ttl);
  if (typeof params.sample_size === "number") form.append("sample_size", String(params.sample_size));

  return await http<UploadRunResponse>("/api/runs/upload", {
    method: "POST",
    body: form,
  });
}

/**
 * Manifest endpoint returns EITHER:
 *  A) { run:..., model:..., tables:... }  (pure manifest)
 *  B) { status:'ok', run_id, files:{...}, manifest:{...} }  (wrapped)
 *
 * We return the raw response; page.tsx normalizes it.
 */
export async function fetchManifest(runId: string): Promise<any> {
  return await http<any>(`/api/runs/${encodeURIComponent(runId)}/manifest`);
}

export async function downloadScoredXlsxByRunId(runId: string) {
  return await downloadFile(`/api/runs/${encodeURIComponent(runId)}/scored.xlsx`, `scored_${runId}.xlsx`);
}

/** ---------- Demo ---------- **/

export async function fetchDemoInsights(): Promise<any> {
  return await http<any>("/api/demo/insights");
}

export async function fetchDemoClusters(): Promise<any> {
  return await http<any>("/api/demo/clusters");
}

export async function fetchDemoClusterInsights(): Promise<any> {
  return await http<any>("/api/demo/clusters/insights");
}

export async function fetchDemoFeatures(): Promise<any> {
  return await http<any>("/api/demo/features");
}

export async function demoSimulate(payload: any): Promise<any> {
  return await http<any>("/api/demo/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
