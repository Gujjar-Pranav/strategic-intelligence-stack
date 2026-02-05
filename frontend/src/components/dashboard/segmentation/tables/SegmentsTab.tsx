"use client";

import React from "react";
import clsx from "clsx";
import {
  Info,
  TrendingUp,
  ShieldAlert,
  ShoppingBag,
  Globe,
  Store,
} from "lucide-react";
import { fmtNumber, pct } from "../utils";

function pickNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function findByCluster(rows: any[], name: string) {
  return rows.find((r: any) => r?.Cluster_Name === name);
}

function MiniBar({ valuePct }: { valuePct?: number }) {
  const v =
    typeof valuePct === "number" ? Math.max(0, Math.min(100, valuePct)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className="h-2 rounded-full bg-gray-900" style={{ width: `${v}%` }} />
    </div>
  );
}

function Chip({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs">
      {icon ? <span className="text-gray-700">{icon}</span> : null}
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export function SegmentsTab({ tables }: { tables: any }) {
  //  Memoize these slices so references are stable and hooks deps are correct
  const clusterSummary = React.useMemo(
    () =>
      Array.isArray(tables?.cluster_summary) ? tables.cluster_summary : [],
    [tables]
  );

  const persona = React.useMemo(
    () => (Array.isArray(tables?.persona_table) ? tables.persona_table : []),
    [tables]
  );

  const revenue = React.useMemo(
    () =>
      Array.isArray(tables?.revenue_contribution_named)
        ? tables.revenue_contribution_named
        : [],
    [tables]
  );

  const promo = React.useMemo(
    () => (Array.isArray(tables?.promo_roi) ? tables.promo_roi : []),
    [tables]
  );

  const risk = React.useMemo(
    () => (Array.isArray(tables?.discount_risk) ? tables.discount_risk : []),
    [tables]
  );

  const channel = React.useMemo(
    () =>
      Array.isArray(tables?.channel_strategy) ? tables.channel_strategy : [],
    [tables]
  );

  const clv = React.useMemo(
    () => (Array.isArray(tables?.clv_summary) ? tables.clv_summary : []),
    [tables]
  );

  // Build stable cluster name list from persona first; fallback to cluster_summary
  const names = React.useMemo(() => {
    const a = persona.map((p: any) => p?.Cluster_Name).filter(Boolean);
    const b = clusterSummary.map((c: any) => c?.Cluster_Name).filter(Boolean);
    return Array.from(new Set([...a, ...b]));
  }, [persona, clusterSummary]);

  const [selected, setSelected] = React.useState<string>(names[0] ?? "");

  //  Fix exhaustive-deps: depend on names array (stable now), not names.join("|")
  React.useEffect(() => {
    if (!selected && names[0]) setSelected(names[0]);
    if (selected && !names.includes(selected)) setSelected(names[0] ?? "");
  }, [names, selected]);

  if (!names.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-900">
        No segment data available. Ensure tables include{" "}
        <code>cluster_summary</code> and <code>persona_table</code>.
      </div>
    );
  }

  const selectedPersona = findByCluster(persona, selected);
  const selectedCluster = findByCluster(clusterSummary, selected);
  const selectedRevenue = findByCluster(revenue, selected);
  const selectedPromo = findByCluster(promo, selected);
  const selectedRisk = findByCluster(risk, selected);
  const selectedChannel = findByCluster(channel, selected);
  const selectedClv = findByCluster(clv, selected);

  const revenuePct = pickNumber(selectedRevenue?.["Revenue_%"]);
  const customerPct =
    pickNumber(selectedRevenue?.["Customer_%"]) ??
    pickNumber(selectedCluster?.["Customer_%"]);

  const promoRate = pickNumber(selectedPromo?.Promo_Response_Rate);
  const riskRate = pickNumber(selectedRisk?.Discount_Addicted_Rate);

  const web = pickNumber(selectedChannel?.Web_Purchase_Ratio);
  const store = pickNumber(selectedChannel?.Store_Purchase_Ratio);
  const catalog = pickNumber(selectedChannel?.Catalog_Purchase_Ratio);

  const actionText = String(selectedPersona?.Business_Action ?? "").trim();
  const traitsText = String(selectedPersona?.Key_Traits ?? "").trim();

  // number-only color helpers
  const classRevenue = "text-sky-700";
  const classCustomers = "text-slate-700";
  const classPromo =
    typeof promoRate === "number" && promoRate >= 0.25
      ? "text-emerald-700"
      : "text-gray-900";
  const classRisk =
    typeof riskRate === "number" && riskRate >= 0.1
      ? "text-rose-600"
      : "text-gray-900";
  const classClv = "text-violet-700";
  const classWeb = "text-teal-700";
  const classStore = "text-amber-700";
  const classCatalog = "text-purple-700";

  const scoreCard = (
    title: string,
    value: React.ReactNode,
    sub?: React.ReactNode,
    danger?: boolean
  ) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-600">{title}</div>
      <div
        className={clsx(
          "mt-1 text-lg font-semibold tracking-tight",
          danger ? "text-rose-600" : "text-gray-900"
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* LEFT: segment list */}
      <div className="lg:col-span-5 space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">Segments</div>
          <div className="mt-1 text-xs text-gray-600">
            Cluster profile = performance + persona + recommended actions.
          </div>
        </div>

        <div className="space-y-2">
          {names.map((name) => {
            const p = findByCluster(persona, name);
            const r = findByCluster(revenue, name);
            const pr = findByCluster(promo, name);
            const rk = findByCluster(risk, name);

            const rPct = pickNumber(r?.["Revenue_%"]);
            const cPct = pickNumber(r?.["Customer_%"]);
            const pRate = pickNumber(pr?.Promo_Response_Rate);
            const riskA = pickNumber(rk?.Discount_Addicted_Rate);

            const promoClass =
              typeof pRate === "number" && pRate >= 0.25
                ? "text-emerald-700"
                : "text-gray-900";
            const riskClass =
              typeof riskA === "number" && riskA >= 0.1
                ? "text-rose-600"
                : "text-gray-900";

            const active = selected === name;

            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                className={clsx(
                  "w-full text-left rounded-2xl border p-4 transition",
                  active
                    ? "border-black bg-gray-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {name}
                    </div>
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {String(p?.Persona ?? "") || traitsText || "—"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[11px] text-gray-600">Revenue %</div>
                    <div
                      className={clsx(
                        "text-sm font-semibold",
                        typeof rPct === "number"
                          ? classRevenue
                          : "text-gray-900"
                      )}
                    >
                      {typeof rPct === "number" ? fmtNumber(rPct, 2) + "%" : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] text-gray-600">Customers</div>
                    <div
                      className={clsx(
                        "text-xs font-semibold",
                        typeof cPct === "number"
                          ? classCustomers
                          : "text-gray-900"
                      )}
                    >
                      {typeof cPct === "number" ? fmtNumber(cPct, 2) + "%" : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] text-gray-600">Promo</div>
                    <div className={clsx("text-xs font-semibold", promoClass)}>
                      {pct(pRate, 1)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="text-[11px] text-gray-600">Risk</div>
                    <div className={clsx("text-xs font-semibold", riskClass)}>
                      {pct(riskA, 1)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: selected segment detail */}
      <div className="lg:col-span-7 space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-gray-600">Selected segment</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
                {selected}
              </div>
              <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                {traitsText || "—"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Chip
                icon={<TrendingUp size={14} />}
                label="Revenue"
                value={
                  <span
                    className={clsx(
                      typeof revenuePct === "number"
                        ? classRevenue
                        : "text-gray-900"
                    )}
                  >
                    {typeof revenuePct === "number"
                      ? `${fmtNumber(revenuePct, 2)}%`
                      : "—"}
                  </span>
                }
              />
              <Chip
                label="Customers"
                value={
                  <span
                    className={clsx(
                      typeof customerPct === "number"
                        ? classCustomers
                        : "text-gray-900"
                    )}
                  >
                    {typeof customerPct === "number"
                      ? `${fmtNumber(customerPct, 2)}%`
                      : "—"}
                  </span>
                }
              />
              <Chip
                icon={<Info size={14} />}
                label="CLV proxy"
                value={
                  <span className={classClv}>
                    {fmtNumber(selectedClv?.Avg_CLV_Proxy, 0)}
                  </span>
                }
              />
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {scoreCard(
            "Promo response",
            <span className={classPromo}>{pct(promoRate, 1)}</span>,
            <MiniBar
              valuePct={
                typeof promoRate === "number" ? promoRate * 100 : undefined
              }
            />
          )}
          {scoreCard(
            "Discount addiction",
            <span className={classRisk}>{pct(riskRate, 1)}</span>,
            <MiniBar
              valuePct={
                typeof riskRate === "number" ? riskRate * 100 : undefined
              }
            />,
            (riskRate ?? 0) >= 0.1
          )}
          {scoreCard(
            "Avg spend",
            <span className="text-gray-900">
              {fmtNumber(
                selectedCluster?.Avg_Total_Spend ??
                  selectedRevenue?.Total_Revenue ??
                  "—",
                2
              )}
            </span>
          )}
        </div>

        {/* Channel mix */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">Channel mix</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Globe size={14} /> Web
              </div>
              <div className={clsx("mt-1 text-sm font-semibold", classWeb)}>
                {pct(web, 1)}
              </div>
              <div className="mt-2">
                <MiniBar
                  valuePct={typeof web === "number" ? web * 100 : undefined}
                />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Store size={14} /> Store
              </div>
              <div className={clsx("mt-1 text-sm font-semibold", classStore)}>
                {pct(store, 1)}
              </div>
              <div className="mt-2">
                <MiniBar
                  valuePct={
                    typeof store === "number" ? store * 100 : undefined
                  }
                />
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ShoppingBag size={14} /> Catalog
              </div>
              <div className={clsx("mt-1 text-sm font-semibold", classCatalog)}>
                {pct(catalog, 1)}
              </div>
              <div className="mt-2">
                <MiniBar
                  valuePct={
                    typeof catalog === "number" ? catalog * 100 : undefined
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldAlert size={16} /> Recommended business actions
          </div>

          {actionText ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-gray-900 space-y-1">
              {actionText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 6)
                .map((s) => (
                  <li key={s}>{s}</li>
                ))}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-gray-900">—</div>
          )}
        </div>
      </div>
    </div>
  );
}
