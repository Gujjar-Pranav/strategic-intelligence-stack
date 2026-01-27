export const EXEC_EXPORT_KEY = "exec_export_payload_v1";

export type ExecExportPayload = {
  mode: "demo" | "upload";
  decisionBanner: string;
  actionTiles: { title: string; bold: string; sub: string }[];
  tables: any;
  manifest?: any;
};

export function setExecExportPayload(payload: ExecExportPayload) {
  try {
    sessionStorage.setItem(EXEC_EXPORT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function getExecExportPayload(): ExecExportPayload | null {
  try {
    const raw = sessionStorage.getItem(EXEC_EXPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
