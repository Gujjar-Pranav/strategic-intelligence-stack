export type TabKey =
  | "overview"
  | "segments"
  | "tables"
  | "simulation"
  | "exports";

export type Mode = "idle" | "demo" | "upload";

/** ---------- Simulation (recompute) ---------- */
export type SimRecomputeState = {
  source_cluster: string;
  target_cluster: string;
  budget_shift_pct: number; // 0..1
  uplift_target: number; // 0..1
  loss_source: number; // 0..1
};
