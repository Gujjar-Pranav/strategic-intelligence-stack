"use client";

import React from "react";
import clsx from "clsx";

type TableVariant =
  | "revenue"
  | "channel"
  | "promo"
  | "risk"
  | "clv"
  | "rfm"
  | "default";

function pickNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * ONLY number coloring (no layout changes)
 */
function numColor(variant: TableVariant, col: string, n?: number, row?: any) {
  if (typeof n !== "number") return "text-gray-900";

  // Generic safety: negatives -> rose, positives -> gray (avoid turning everything green)
  if (n < 0) return "text-rose-600";

  if (variant === "revenue") {
    if (col === "Revenue_%") return "text-indigo-600";
    if (col === "Customer_%") return "text-violet-600";
  }

  if (variant === "promo") {
    if (col === "Promo_Response_Rate") return "text-emerald-600";
    if (col === "Avg_Deal_Dependency") return "text-amber-700";
  }

  if (variant === "risk") {
    if (col === "Discount_Addicted_Rate") {
      const danger = n >= 0.1;
      return danger ? "text-rose-600" : "text-amber-700";
    }
  }

  if (variant === "channel") {
    if (
      col === "Web_Purchase_Ratio" ||
      col === "Store_Purchase_Ratio" ||
      col === "Catalog_Purchase_Ratio"
    ) {
      // keep your number color (single tone)
      return "text-teal-600";
    }
  }

  if (variant === "clv") {
    if (col === "Avg_CLV_Proxy") return "text-indigo-600";
  }

  if (variant === "rfm") {
    if (col === "Recency_RFM") return "text-violet-700";
    if (col === "Frequency_RFM") return "text-sky-700";
    if (col === "Monetary_RFM") return "text-emerald-700";
  }

  return "text-gray-900";
}

/**
 * ✅ Bar fill color (micro-bars / mini-bars / spark bars)
 * Keep it consistent with numColor without changing layout.
 */
function barColor(variant: TableVariant, col: string, n?: number) {
  // Defaults
  let fill = "bg-gray-900";

  if (variant === "revenue") {
    if (col === "Revenue_%") fill = "bg-indigo-600";
    if (col === "Customer_%") fill = "bg-violet-600";
  }

  if (variant === "promo") {
    if (col === "Promo_Response_Rate") fill = "bg-emerald-600";
    if (col === "Avg_Deal_Dependency") fill = "bg-amber-700";
  }

  if (variant === "risk") {
    if (col === "Discount_Addicted_Rate") {
      const danger = typeof n === "number" && n >= 0.1;
      fill = danger ? "bg-rose-600" : "bg-amber-700";
    }
  }

  if (variant === "channel") {
    if (col === "Web_Purchase_Ratio") fill = "bg-teal-600";
    if (col === "Store_Purchase_Ratio") fill = "bg-amber-700";
    if (col === "Catalog_Purchase_Ratio") fill = "bg-violet-600";
  }

  if (variant === "clv") {
    if (col === "Avg_CLV_Proxy") fill = "bg-indigo-600";
  }

  if (variant === "rfm") {
    if (col === "Recency_RFM") fill = "bg-violet-700";
    if (col === "Frequency_RFM") fill = "bg-sky-700";
    if (col === "Monetary_RFM") fill = "bg-emerald-700";
  }

  return fill;
}

function toCsv(rows: any[], cols: string[]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    cols.map(esc).join(","),
    ...rows.map((r) => cols.map((c) => esc(r?.[c])).join(",")),
  ];
  return lines.join("\n");
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MiniBar({
  value01,
  fillClass = "bg-gray-900",
}: {
  value01?: number;
  fillClass?: string;
}) {
  const v = typeof value01 === "number" ? clamp01(value01) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={clsx("h-2 rounded-full", fillClass)}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}

function SparkBars3({
  a,
  b,
  c,
  labels = ["A", "B", "C"],
  fillA = "bg-gray-900",
  fillB = "bg-gray-700",
  fillC = "bg-gray-400",
}: {
  a?: number;
  b?: number;
  c?: number;
  labels?: [string, string, string];
  fillA?: string;
  fillB?: string;
  fillC?: string;
}) {
  const A = typeof a === "number" ? clamp01(a) : 0;
  const B = typeof b === "number" ? clamp01(b) : 0;
  const C = typeof c === "number" ? clamp01(c) : 0;

  return (
    <div className="flex items-end gap-1">
      <div
        className={clsx("w-2 rounded", fillA)}
        style={{ height: `${Math.max(6, A * 22)}px` }}
        title={`${labels[0]} ${(A * 100).toFixed(1)}%`}
      />
      <div
        className={clsx("w-2 rounded", fillB)}
        style={{ height: `${Math.max(6, B * 22)}px` }}
        title={`${labels[1]} ${(B * 100).toFixed(1)}%`}
      />
      <div
        className={clsx("w-2 rounded", fillC)}
        style={{ height: `${Math.max(6, C * 22)}px` }}
        title={`${labels[2]} ${(C * 100).toFixed(1)}%`}
      />
    </div>
  );
}

/**
 * Decide which column gets micro-visual emphasis per variant
 * and how to render it.
 */
function cellRenderer(variant: TableVariant, col: string, raw: any, row: any) {
  const v = pickNumber(raw);

  // Helpers for number formatting
  const asPct = (n?: number, digits = 2) =>
    typeof n === "number" ? `${n.toFixed(digits)}%` : String(raw ?? "—");
  const asRatePct = (n?: number, digits = 1) =>
    typeof n === "number"
      ? `${(n * 100).toFixed(digits)}%`
      : String(raw ?? "—");
  const asNum = (n?: number, digits = 2) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { maximumFractionDigits: digits })
      : String(raw ?? "—");

  // ---- Revenue table micro visuals
  if (variant === "revenue") {
    if (col === "Revenue_%") {
      const pctVal = pickNumber(raw); // already percent number
      return (
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, pctVal, row))}>
              {asPct(pctVal, 2)}
            </span>
            <span className="text-[11px] text-gray-500">share</span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof pctVal === "number" ? pctVal / 100 : undefined}
              fillClass={barColor(variant, col, pctVal)}
            />
          </div>
        </div>
      );
    }

    if (col === "Customer_%") {
      const pctVal = pickNumber(raw);
      return (
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, pctVal, row))}>
              {asPct(pctVal, 2)}
            </span>
            <span className="text-[11px] text-gray-500">customers</span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof pctVal === "number" ? pctVal / 100 : undefined}
              fillClass={barColor(variant, col, pctVal)}
            />
          </div>
        </div>
      );
    }
  }

  // ---- Promo table micro visuals
  if (variant === "promo") {
    if (col === "Promo_Response_Rate") {
      const rate = pickNumber(raw); // 0..1
      return (
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, rate, row))}>
              {asRatePct(rate, 1)}
            </span>
            <span className="text-[11px] text-gray-500">response</span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof rate === "number" ? rate : undefined}
              fillClass={barColor(variant, col, rate)}
            />
          </div>
        </div>
      );
    }

    if (col === "Avg_Deal_Dependency") {
      const dd = pickNumber(raw); // usually 0..1-ish
      return (
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, dd, row))}>
              {asNum(dd, 3)}
            </span>
            <span className="text-[11px] text-gray-500">deal dep.</span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof dd === "number" ? clamp01(dd) : undefined}
              fillClass={barColor(variant, col, dd)}
            />
          </div>
        </div>
      );
    }
  }

  // ---- Risk table micro visuals
  if (variant === "risk") {
    if (col === "Discount_Addicted_Rate") {
      const r = pickNumber(raw); // 0..1
      const danger = typeof r === "number" && r >= 0.1;

      return (
        <div className="min-w-[180px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, r, row))}>
              {asRatePct(r, 1)}
            </span>
            <span
              className={clsx(
                "text-[11px]",
                danger ? "text-rose-600" : "text-gray-500"
              )}
            >
              {danger ? "high risk" : "risk"}
            </span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof r === "number" ? r : undefined}
              fillClass={barColor(variant, col, r)}
            />
          </div>
        </div>
      );
    }
  }

  // ---- Channel table micro visuals
  if (variant === "channel") {
    if (
      col === "Web_Purchase_Ratio" ||
      col === "Store_Purchase_Ratio" ||
      col === "Catalog_Purchase_Ratio"
    ) {
      const ratio = pickNumber(raw); // 0..1
      return (
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, ratio, row))}>
              {asRatePct(ratio, 1)}
            </span>
            <span className="text-[11px] text-gray-500">share</span>
          </div>
          <div className="mt-1">
            <MiniBar
              value01={typeof ratio === "number" ? ratio : undefined}
              fillClass={barColor(variant, col, ratio)}
            />
          </div>
        </div>
      );
    }

    // Add a compact 3-bar spark at Cluster_Name column, if present
    if (col === "Cluster_Name") {
      const web = pickNumber(row?.Web_Purchase_Ratio);
      const store = pickNumber(row?.Store_Purchase_Ratio);
      const catalog = pickNumber(row?.Catalog_Purchase_Ratio);

      return (
        <div className="flex items-center justify-between gap-3 min-w-[260px]">
          <span className="font-semibold text-gray-900">{String(raw ?? "")}</span>
          <SparkBars3
            a={web}
            b={store}
            c={catalog}
            labels={["Web", "Store", "Catalog"]}
            fillA={barColor(variant, "Web_Purchase_Ratio", web)}
            fillB={barColor(variant, "Store_Purchase_Ratio", store)}
            fillC={barColor(variant, "Catalog_Purchase_Ratio", catalog)}
          />
        </div>
      );
    }
  }

  // ---- CLV table micro visuals
  if (variant === "clv") {
    if (col === "Avg_CLV_Proxy") {
      const n = pickNumber(raw);
      return (
        <span className={clsx("font-semibold", numColor(variant, col, n, row))}>
          {asNum(n, 0)}
        </span>
      );
    }
  }

  // ---- RFM table micro visuals
  if (variant === "rfm") {
    if (col === "Recency_RFM" || col === "Frequency_RFM" || col === "Monetary_RFM") {
      const n = pickNumber(raw);
      return (
        <span className={clsx("font-semibold", numColor(variant, col, n, row))}>
          {asNum(n, 2)}
        </span>
      );
    }
  }

  // Default: if it's numeric, color it; otherwise keep as-is
  if (typeof v === "number") {
    return (
      <span className={clsx("font-semibold", numColor(variant, col, v, row))}>
        {String(raw ?? "")}
      </span>
    );
  }

  return String(raw ?? "");
}

export function DataTable({
  title,
  rows,
  variant = "default",
}: {
  title: string;
  rows: any[];
  variant?: TableVariant;
}) {
  if (!rows?.length) return null;

  const cols = Object.keys(rows[0] ?? {});
  const [q, setQ] = React.useState("");

  // for CLV visual normalization
  const maxClv = React.useMemo(() => {
    if (variant !== "clv") return undefined;
    const vals = rows
      .map((r) => pickNumber(r?.Avg_CLV_Proxy))
      .filter((x): x is number => typeof x === "number");
    if (!vals.length) return undefined;
    return Math.max(...vals);
  }, [rows, variant]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) =>
      cols.some((c) =>
        String(r?.[c] ?? "").toLowerCase().includes(query)
      )
    );
  }, [q, rows, cols]);

  // Add “rank bar” for CLV rows (no new columns, just enhanced cell render)
  const renderCell = (col: string, raw: any, row: any) => {
    if (variant === "clv" && col === "Avg_CLV_Proxy") {
      const n = pickNumber(raw);
      const denom =
        typeof maxClv === "number" && maxClv > 0 ? maxClv : undefined;
      const value01 =
        typeof n === "number" && denom ? clamp01(n / denom) : undefined;

      return (
        <div className="min-w-[220px]">
          <div className="flex items-center justify-between gap-2">
            <span className={clsx("font-semibold", numColor(variant, col, n, row))}>
              {typeof n === "number"
                ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "—"}
            </span>
            <span className="text-[11px] text-gray-500">relative</span>
          </div>
          <div className="mt-1">
            <MiniBar value01={value01} fillClass={barColor(variant, col, n)} />
          </div>
        </div>
      );
    }

    // RFM: show 3 tiny bars inside Cluster_Name if all exist
    if (variant === "rfm" && col === "Cluster_Name") {
      const r = pickNumber(row?.Recency_RFM);
      const f = pickNumber(row?.Frequency_RFM);
      const m = pickNumber(row?.Monetary_RFM);
      // normalize roughly into 0..1 for visual only
      const norm = (x?: number) =>
        typeof x === "number" ? clamp01(x / 100) : undefined;

      return (
        <div className="flex items-center justify-between gap-3 min-w-[260px]">
          <span className="font-semibold text-gray-900">{String(raw ?? "")}</span>
          <SparkBars3
            a={norm(r)}
            b={norm(f)}
            c={norm(m)}
            labels={["R", "F", "M"]}
            fillA={barColor(variant, "Recency_RFM", r)}
            fillB={barColor(variant, "Frequency_RFM", f)}
            fillC={barColor(variant, "Monetary_RFM", m)}
          />
        </div>
      );
    }

    return cellRenderer(variant, col, raw, row);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="mt-1 text-xs text-gray-600">
            Rows: <span className="font-semibold text-gray-900">{filtered.length}</span>
            {filtered.length !== rows.length ? (
              <span className="text-gray-500"> (filtered from {rows.length})</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 w-56 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400"
          />
          <button
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-900 hover:bg-gray-50"
            onClick={() => {
              const csv = toCsv(filtered, cols);
              const safe = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
              downloadTextFile(`${safe || "table"}.csv`, csv);
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-4 py-2 text-left font-semibold text-gray-900 whitespace-nowrap border-b border-gray-200"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={i}
                className={clsx(
                  "border-t border-gray-100",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                )}
              >
                {cols.map((c) => (
                  <td
                    key={c}
                    className="px-4 py-2 text-gray-900 whitespace-nowrap"
                    title={String(r?.[c] ?? "")}
                  >
                    {renderCell(c, r?.[c], r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length ? (
        <div className="mt-3 text-sm text-gray-900">No matching rows.</div>
      ) : null}
    </div>
  );
}
