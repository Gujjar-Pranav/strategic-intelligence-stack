"use client";

import React from "react";
import clsx from "clsx";

import { getExecExportPayload } from "@/components/dashboard/segmentation/exports/exportPayload";
import { fmtNumber } from "@/components/dashboard/segmentation/utils";
import { BICharts } from "@/components/dashboard/segmentation/charts/BICharts";

function pickNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function bestBy(rows: any[], field: string) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    [...rows].sort(
      (a, b) =>
        (pickNum(b?.[field]) ?? -Infinity) - (pickNum(a?.[field]) ?? -Infinity)
    )[0] ?? null
  );
}

function worstBy(rows: any[], field: string) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    [...rows].sort(
      (a, b) =>
        (pickNum(a?.[field]) ?? Infinity) - (pickNum(b?.[field]) ?? Infinity)
    )[0] ?? null
  );
}

function fmtMaybe(n?: number, digits = 2) {
  return typeof n === "number" ? fmtNumber(n, digits) : "—";
}

function rateMaybe01(n?: number, digits = 1) {
  return typeof n === "number" ? `${(n * 100).toFixed(digits)}%` : "—";
}

function todayStamp(isoLike?: string) {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return String(isoLike);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="exec-keep rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      {note ? <div className="mt-1 text-xs text-gray-600">{note}</div> : null}
    </div>
  );
}

function TwoCol({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

function InsightBox({
  title,
  bullets,
  tone = "neutral",
}: {
  title: string;
  bullets: string[];
  tone?: "neutral" | "good" | "risk";
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "risk"
      ? "border-rose-200 bg-rose-50"
      : "border-gray-200 bg-gray-50";

  return (
    <div className={clsx("exec-keep rounded-2xl border p-4", toneCls)}>
      <div className="text-xs font-semibold text-gray-900">{title}</div>
      <ul className="mt-2 list-disc pl-5 text-xs text-gray-800 space-y-1">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function PrintTable({
  title,
  rows,
  columns,
  maxRows = 12,
  format,
}: {
  title: string;
  rows: any[];
  columns: string[];
  maxRows?: number;
  format?: (col: string, v: any) => React.ReactNode;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const slice = safeRows.slice(0, maxRows);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 exec-keep">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">
          Showing {slice.length} of {safeRows.length}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left font-semibold text-gray-900 border-b border-gray-200"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr
                key={i}
                className={clsx(i % 2 ? "bg-gray-50/40" : "bg-white")}
              >
                {columns.map((c) => {
                  const raw = r?.[c];
                  return (
                    <td
                      key={c}
                      className="px-3 py-2 text-gray-900 border-t border-gray-100 align-top"
                    >
                      {format ? format(c, raw) : String(raw ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {safeRows.length > maxRows ? (
        <div className="mt-2 text-[11px] text-gray-500">
          Appendix is trimmed for print readability.
        </div>
      ) : null}
    </div>
  );
}

function formatAppendixValue(col: string, v: any) {
  const n = pickNum(v);

  if (col === "Promo_Response_Rate" || col === "Discount_Addicted_Rate") {
    return typeof n === "number"
      ? `${(n * 100).toFixed(1)}%`
      : String(v ?? "—");
  }
  if (
    col === "Web_Purchase_Ratio" ||
    col === "Store_Purchase_Ratio" ||
    col === "Catalog_Purchase_Ratio"
  ) {
    return typeof n === "number"
      ? `${(n * 100).toFixed(1)}%`
      : String(v ?? "—");
  }
  if (col === "Revenue_%" || col === "Customer_%") {
    return typeof n === "number" ? `${n.toFixed(2)}%` : String(v ?? "—");
  }
  return String(v ?? "—");
}

export default function ExecutiveExportPage() {
  const [payload, setPayload] = React.useState<any>(null);
  const [ready, setReady] = React.useState(false);

  const isPdf =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("print") === "1";

  React.useEffect(() => {
    const p = getExecExportPayload();
    setPayload(p ?? null);
    setReady(true);

    // Only auto-print for manual browser workflow (NOT for server PDF capture)
    if (!isPdf) {
      const t = setTimeout(() => window.print(), 900);
      return () => clearTimeout(t);
    }
  }, [isPdf]);

  if (!ready) {
    return (
      <div className={clsx("exec-print-root bg-white p-8", isPdf && "exec-pdf")}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-sm font-semibold text-gray-900">
            Preparing Executive Summary…
          </div>
          <div className="mt-2 text-sm text-gray-700">
            Loading the latest dashboard snapshot.
          </div>
        </div>
        <style jsx global>{PRINT_CSS}</style>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className={clsx("exec-print-root bg-white p-8", isPdf && "exec-pdf")}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-sm font-semibold text-gray-900">
            No export payload found
          </div>
          <div className="mt-2 text-sm text-gray-700">
            Go back to the dashboard and click <b>Export PDF</b> again.
          </div>
        </div>
        <style jsx global>{PRINT_CSS}</style>
      </div>
    );
  }

  const { tables, decisionBanner, actionTiles, manifest, mode } = payload;

  const safeTables = tables ?? {};
  const revenue = Array.isArray(safeTables?.revenue_contribution_named)
    ? safeTables.revenue_contribution_named
    : [];
  const promo = Array.isArray(safeTables?.promo_roi) ? safeTables.promo_roi : [];
  const risk = Array.isArray(safeTables?.discount_risk)
    ? safeTables.discount_risk
    : [];
  const channel = Array.isArray(safeTables?.channel_strategy)
    ? safeTables.channel_strategy
    : [];
  const clv = Array.isArray(safeTables?.clv_summary)
    ? safeTables.clv_summary
    : [];
  const persona = Array.isArray(safeTables?.persona_table)
    ? safeTables.persona_table
    : [];
  const rfm = Array.isArray(safeTables?.rfm_summary)
    ? safeTables.rfm_summary
    : [];

  const topRevenue = bestBy(revenue, "Revenue_%");
  const topCustomers = bestBy(revenue, "Customer_%");
  const topPromo = bestBy(promo, "Promo_Response_Rate");
  const topRisk = bestBy(risk, "Discount_Addicted_Rate");
  const topClv = bestBy(clv, "Avg_CLV_Proxy");
  const safestRisk = worstBy(risk, "Discount_Addicted_Rate");

  const findRow = (arr: any[], name?: string) =>
    arr.find((x) => x?.Cluster_Name === name);

  const tr = topRevenue?.Cluster_Name;
  const tp = topPromo?.Cluster_Name;
  const tk = topRisk?.Cluster_Name;

  const trPromo = findRow(promo, tr);
  const trRisk = findRow(risk, tr);
  const trChannel = findRow(channel, tr);
  const trRfm = findRow(rfm, tr);

  const createdAt =
    manifest?.run?.created_at_utc ||
    manifest?.run?.created_at ||
    manifest?.created_at_utc ||
    manifest?.created_at;

  const runMeta =
    mode === "upload" && manifest?.run
      ? `Model v${manifest?.model?.version ?? "—"} · k=${
          manifest?.model?.k ?? "—"
        } · Created ${todayStamp(createdAt)}`
      : "Demo run";

  const oppBullets: string[] = [];
  if (tr) {
    oppBullets.push(
      `Prioritize “${tr}” as the revenue engine; protect experience and retention.`
    );

    const pr = pickNum(trPromo?.Promo_Response_Rate);
    if (typeof pr === "number") {
      oppBullets.push(
        pr >= 0.25
          ? `Promo responsiveness is strong (${rateMaybe01(
              pr
            )}). Use targeted offers; avoid blanket discounts.`
          : `Promo responsiveness is moderate (${rateMaybe01(
              pr
            )}). Use value messaging + bundles over discounts.`
      );
    }

    const rr = pickNum(trRisk?.Discount_Addicted_Rate);
    if (typeof rr === "number") {
      oppBullets.push(
        rr >= 0.1
          ? `Discount addiction risk is elevated (${rateMaybe01(
              rr
            )}). Apply guardrails (caps, exclusions, cadence).`
          : `Discount addiction risk is controlled (${rateMaybe01(
              rr
            )}). Keep promos selective.`
      );
    }

    const w = pickNum(trChannel?.Web_Purchase_Ratio);
    const s = pickNum(trChannel?.Store_Purchase_Ratio);
    const c = pickNum(trChannel?.Catalog_Purchase_Ratio);
    if (
      typeof w === "number" ||
      typeof s === "number" ||
      typeof c === "number"
    ) {
      oppBullets.push(
        `Channel mix: Web ${rateMaybe01(w)} · Store ${rateMaybe01(
          s
        )} · Catalog ${rateMaybe01(c)}.`
      );
    }

    const R = pickNum(trRfm?.Recency_RFM);
    const F = pickNum(trRfm?.Frequency_RFM);
    const M = pickNum(trRfm?.Monetary_RFM);
    if (
      typeof R === "number" ||
      typeof F === "number" ||
      typeof M === "number"
    ) {
      oppBullets.push(
        `RFM snapshot: R ${fmtMaybe(R, 2)} · F ${fmtMaybe(F, 2)} · M ${fmtMaybe(
          M,
          2
        )}.`
      );
    }
  }

  const riskBullets: string[] = [];
  if (tk) {
    riskBullets.push(
      `Highest discount-risk segment: “${tk}”. Limit exposure to aggressive promotions.`
    );
    const rr = pickNum(topRisk?.Discount_Addicted_Rate);
    if (typeof rr === "number") {
      riskBullets.push(
        rr >= 0.1
          ? `Risk is materially high (${rateMaybe01(
              rr
            )}). Implement promo caps + qualification rules immediately.`
          : `Risk is present (${rateMaybe01(
              rr
            )}). Keep promos selective and monitor repeat-discount behavior.`
      );
    }
  }
  if (safestRisk?.Cluster_Name) {
    riskBullets.push(
      `Lowest-risk segment: “${safestRisk.Cluster_Name}” (safer for retention-led offers).`
    );
  }

  const plan30: string[] = [
    `Confirm priority segments: revenue engine (“${tr ?? "—"}”), promo winner (“${
      tp ?? "—"
    }”), risk watchlist (“${tk ?? "—"}”).`,
    "Define promo guardrails (caps, eligibility, cooldown windows).",
    "Align channel investment by segment preference (web/store/catalog).",
  ];

  const plan60: string[] = [
    "Launch 2–3 segment-specific campaigns with measurement (holdouts/uplift).",
    "Implement lifecycle triggers (winback, replenishment, VIP retention).",
    "Review margin impact and suppression rules for high-risk segments.",
  ];

  const plan90: string[] = [
    "Scale winning playbooks and automate segmentation refresh cadence.",
    "Operationalize KPI review: revenue share, promo lift, discount risk, channel mix.",
    "Refine offer architecture (tiering, personalization, exclusions, frequency caps).",
  ];

  const reportTitle = "Segmentation & Growth Recommendations";
  const reportSub = "Executive Summary";
  const clientLabel =
    manifest?.dataset?.client_name ||
    manifest?.client_name ||
    "Customer Segmentation";
  const confidentiality = "Confidential — For internal use only";

  return (
    <div className={clsx("exec-print-root bg-white p-8", isPdf && "exec-pdf")}>
      <style jsx global>{PRINT_CSS}</style>

      {/* ================= PAGE 1: COVER + TOC (combined) ================= */}
      <div className="exec-cover-toc exec-keep">
        <div className="exec-cover-top">
          <div className="text-xs text-gray-600">{reportSub}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            {reportTitle}
          </div>
          <div className="mt-3 text-sm text-gray-700">{clientLabel}</div>
          <div className="mt-2 text-xs text-gray-600">{runMeta}</div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-semibold text-gray-900">Purpose</div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            This report summarizes customer segmentation outputs and recommends
            actions to drive revenue growth while controlling promotion-driven
            margin erosion. Findings are based on revenue contribution,
            promotion responsiveness, discount addiction risk, channel mix, and
            CLV proxy.
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <span className="font-semibold text-gray-900">Confidentiality:</span>{" "}
            {confidentiality}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-sm font-semibold text-gray-900">
            Table of Contents
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-800">
            {[
              ["1. Executive Overview", "2"],
              ["2. Decision & Key Metrics", "2"],
              ["3. Insights: Opportunities & Risks", "3"],
              ["4. Recommended Actions & 30/60/90 Plan", "4"],
              ["5. Performance Visuals", "5"],
              ["6. Appendix", "6+"],
            ].map(([label, page]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4"
              >
                <div className="exec-toc-item">{label}</div>
                <div className="exec-toc-dots" />
                <div className="exec-toc-page">{page}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-[11px] text-gray-500">
            Note: Page numbers are approximate and may vary slightly by data
            volume.
          </div>
        </div>
      </div>

      {/* ================= PAGE 2: OVERVIEW + DECISION + KPIs ================= */}
      <section className="exec-page exec-page-2">
        <div className="exec-section">
          <div className="exec-section-kicker">1. Executive Overview</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            What this run indicates
          </div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            This executive summary highlights the most impactful segments for
            growth, promotion targeting, and discount-risk management based on
            the current segmentation snapshot. Use this as a decision-ready
            brief; the dashboard remains the system of record for drilldowns and
            execution.
          </div>
        </div>

        <div className="mt-5 exec-keep rounded-2xl border border-gray-200 bg-white p-5">
          <SectionTitle
            title="2. Decision"
            sub="Leadership-ready recommendation."
          />
          <div className="text-sm font-semibold text-gray-900">
            {decisionBanner ?? "—"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Top revenue segment"
            value={topRevenue?.Cluster_Name ?? "—"}
            note={
              topRevenue ? (
                <>
                  Revenue share{" "}
                  <span className="font-semibold text-sky-700">
                    {fmtMaybe(pickNum(topRevenue?.["Revenue_%"]), 2)}%
                  </span>{" "}
                  · Customers{" "}
                  <span className="font-semibold text-violet-700">
                    {fmtMaybe(pickNum(topRevenue?.["Customer_%"]), 2)}%
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
          <StatCard
            label="Largest customer base"
            value={topCustomers?.Cluster_Name ?? "—"}
            note={
              topCustomers ? (
                <>
                  Customers{" "}
                  <span className="font-semibold text-violet-700">
                    {fmtMaybe(pickNum(topCustomers?.["Customer_%"]), 2)}%
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
          <StatCard
            label="Best promo responder"
            value={topPromo?.Cluster_Name ?? "—"}
            note={
              topPromo ? (
                <>
                  Promo response{" "}
                  <span className="font-semibold text-emerald-700">
                    {rateMaybe01(pickNum(topPromo?.Promo_Response_Rate), 1)}
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
          <StatCard
            label="Highest discount risk"
            value={topRisk?.Cluster_Name ?? "—"}
            note={
              topRisk ? (
                <>
                  Discount addicted{" "}
                  <span className="font-semibold text-rose-600">
                    {rateMaybe01(pickNum(topRisk?.Discount_Addicted_Rate), 1)}
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
        </div>

        <div className="mt-5 exec-keep rounded-2xl border border-gray-200 bg-white p-5">
          <SectionTitle
            title="2.1 Key segment markers"
            sub="Decision support: who matters and why."
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Revenue engine
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {tr ?? "—"}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Revenue{" "}
                {topRevenue
                  ? `${fmtMaybe(pickNum(topRevenue?.["Revenue_%"]), 2)}%`
                  : "—"}{" "}
                · Customers{" "}
                {topRevenue
                  ? `${fmtMaybe(pickNum(topRevenue?.["Customer_%"]), 2)}%`
                  : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Promo winner
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {tp ?? "—"}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Response{" "}
                {topPromo
                  ? rateMaybe01(pickNum(topPromo?.Promo_Response_Rate), 1)
                  : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Top CLV
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {topClv?.Cluster_Name ?? "—"}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                CLV proxy{" "}
                {topClv ? fmtMaybe(pickNum(topClv?.Avg_CLV_Proxy), 0) : "—"}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500">
            Footnote: Promo/Risk/Channel metrics are rates (0–1) printed as
            percentages; revenue/customer shares are 0–100.
          </div>
        </div>
      </section>

      {/* ================= PAGE 3: INSIGHTS + ACTIONS ================= */}
      <section className="exec-page exec-page-3">
        <div className="exec-section">
          <div className="exec-section-kicker">3. Insights</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            Opportunities and guardrails
          </div>
        </div>

        <div className="mt-4">
          <TwoCol
            left={
              <InsightBox
                title="3.1 Growth opportunities (what to do)"
                tone="good"
                bullets={
                  oppBullets.length
                    ? oppBullets
                    : [
                        "Not enough data in payload to generate opportunity insights.",
                      ]
                }
              />
            }
            right={
              <InsightBox
                title="3.2 Risk & guardrails (what to avoid)"
                tone="risk"
                bullets={
                  riskBullets.length
                    ? riskBullets
                    : ["Not enough data in payload to generate risk insights."]
                }
              />
            }
          />
        </div>

        <div className="mt-6 exec-section">
          <div className="exec-section-kicker">4. Recommended actions</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            What to execute next
          </div>
        </div>

        <div className="mt-4 exec-keep rounded-2xl border border-gray-200 bg-white p-5">
          <SectionTitle title="4.1 Action tiles" sub="Next best moves for execution." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Array.isArray(actionTiles) ? actionTiles : [])
              .slice(0, 4)
              .map((t: any, idx: number) => (
                <div
                  key={t?.title ?? idx}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="text-xs text-gray-600">{t?.title ?? "—"}</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {t?.bold ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-gray-700">{t?.sub ?? ""}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 exec-keep">
          <SectionTitle title="4.2 30 / 60 / 90-day plan" sub="Practical rollout sequence." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InsightBox title="Next 30 days" bullets={plan30} />
            <InsightBox title="Next 60 days" bullets={plan60} />
            <InsightBox title="Next 90 days" bullets={plan90} />
          </div>
        </div>
      </section>

      {/* ================= PAGE 4: VISUALS ================= */}
      <section className="exec-page exec-page-4">
        <div className="exec-section">
          <div className="exec-section-kicker">5. Performance visuals</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            How segments compare
          </div>
          <div className="mt-2 text-sm text-gray-700 leading-relaxed">
            Visuals summarize revenue contribution, promotion responsiveness,
            discount risk, and channel mix.
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="exec-print-charts">
            <BICharts tables={safeTables} printMode />
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            Note: Tooltips and interactive controls are suppressed in print for a clean PDF.
          </div>
        </div>
      </section>

      {/* ================= PAGE 5+: APPENDIX ================= */}
      <section className="exec-page exec-page-5">
        <div className="exec-section">
          <div className="exec-section-kicker">6. Appendix</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
            Key tables
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4">
            {revenue.length ? (
              <PrintTable
                title="Revenue contribution"
                rows={[...revenue].sort(
                  (a, b) =>
                    (pickNum(b?.["Revenue_%"]) ?? 0) -
                    (pickNum(a?.["Revenue_%"]) ?? 0)
                )}
                columns={["Cluster_Name", "Revenue_%", "Customer_%", "Customers"]}
                maxRows={12}
                format={formatAppendixValue}
              />
            ) : null}

            {promo.length ? (
              <PrintTable
                title="Promo response & deal dependency"
                rows={[...promo].sort(
                  (a, b) =>
                    (pickNum(b?.Promo_Response_Rate) ?? 0) -
                    (pickNum(a?.Promo_Response_Rate) ?? 0)
                )}
                columns={[
                  "Cluster_Name",
                  "Promo_Response_Rate",
                  "Avg_Deal_Dependency",
                ]}
                maxRows={12}
                format={formatAppendixValue}
              />
            ) : null}

            {risk.length ? (
              <PrintTable
                title="Discount addiction risk"
                rows={[...risk].sort(
                  (a, b) =>
                    (pickNum(b?.Discount_Addicted_Rate) ?? 0) -
                    (pickNum(a?.Discount_Addicted_Rate) ?? 0)
                )}
                columns={["Cluster_Name", "Discount_Addicted_Rate"]}
                maxRows={12}
                format={formatAppendixValue}
              />
            ) : null}

            {channel.length ? (
              <PrintTable
                title="Channel strategy"
                rows={channel}
                columns={[
                  "Cluster_Name",
                  "Web_Purchase_Ratio",
                  "Store_Purchase_Ratio",
                  "Catalog_Purchase_Ratio",
                ]}
                maxRows={12}
                format={formatAppendixValue}
              />
            ) : null}

            {clv.length ? (
              <PrintTable
                title="CLV proxy"
                rows={[...clv].sort(
                  (a, b) =>
                    (pickNum(b?.Avg_CLV_Proxy) ?? 0) -
                    (pickNum(a?.Avg_CLV_Proxy) ?? 0)
                )}
                columns={["Cluster_Name", "Avg_CLV_Proxy"]}
                maxRows={12}
                format={formatAppendixValue}
              />
            ) : null}

            {persona.length ? (
              <PrintTable
                title="Personas (short)"
                rows={persona}
                columns={["Cluster_Name", "Persona", "Key_Traits"]}
                maxRows={8}
              />
            ) : null}
          </div>

          <div className="mt-4 text-[11px] text-gray-500">
            Notes: Promo/Risk/Channel columns are rates. This appendix prints them as percentages for readability.
          </div>
        </div>

        <div className="no-print mt-6 text-[11px] text-gray-500">
          Generated from current dashboard snapshot · Executive Summary (narrative + appendix)
        </div>
      </section>
    </div>
  );
}

const PRINT_CSS = `
/* ====== EXEC PDF PRINT TUNING (A4 + consulting layout) ====== */

.exec-print-root { max-width: 1050px; margin: 0 auto; }

.exec-keep { break-inside: avoid; page-break-inside: avoid; }

.exec-section { margin-top: 6px; }
.exec-section-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

/* TOC */
.exec-toc-item { font-size: 14px; color: #0f172a; }
.exec-toc-page { font-size: 13px; color: #0f172a; }
.exec-toc-dots {
  flex: 1;
  height: 1px;
  border-bottom: 1px dotted rgba(148, 163, 184, 0.9);
  margin-top: 10px;
}

/* Cover+TOC block should be allowed to share a page */
.exec-cover-toc { break-inside: avoid; page-break-inside: avoid; }

/* Print */
@media print {
  @page { size: A4; margin: 14mm; }

  html, body { background: #fff !important; height: auto !important; }

  /* Hide interactive UI */
  .no-print { display: none !important; }
  .exec-print-charts button { display: none !important; }
  .exec-print-charts .recharts-tooltip-wrapper { display: none !important; }

  /* Let Puppeteer header/footer handle top/bottom; don't reserve extra space */
  .exec-print-root { padding: 0 !important; margin: 0 auto !important; }

  /* ✅ Hard page starts (prevents random blank pages) */
  .exec-page { break-before: page; page-break-before: always; }
  .exec-cover-toc { break-before: auto; page-break-before: auto; }

  /* Prevent lonely headings */
  .exec-section { break-after: avoid-page; page-break-after: avoid; }

  /* Charts: parent controls height; responsive container fills it */
  .exec-print-charts .recharts-responsive-container { width: 100% !important; height: 100% !important; }

  /* Avoid ugly splits for tables */
  table, tr { break-inside: avoid !important; page-break-inside: avoid !important; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }

  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
