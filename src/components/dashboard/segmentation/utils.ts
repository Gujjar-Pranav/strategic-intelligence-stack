import type { Mode } from "./types";

/** ---------- Formatting ---------- */
export function fmtNumber(x: any, digits = 0) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function pct(x: any, digits = 1) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/** ---------- Clipboard ---------- */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/** ---------- Normalize manifest shape (upload) ---------- */
export function normalizeManifest(raw: any) {
  // if wrapped: { status, run_id, files, manifest: {...} }
  if (raw && typeof raw === "object" && raw.manifest && raw.manifest.run) return raw.manifest;
  return raw;
}

export function normalizeFiles(raw: any) {
  if (raw?.files) return raw.files;
  return undefined;
}

/** ---------- Data extraction (demo+upload) ---------- */
export function getTables(mode: Mode, demoClusterInsights: any, manifestRaw: any) {
  if (mode === "demo") return demoClusterInsights?.tables ?? {};
  const mf = normalizeManifest(manifestRaw);
  return mf?.tables ?? {};
}

export function pickSpotlightCluster(tables: any) {
  const revenue = Array.isArray(tables.revenue_contribution_named)
    ? [...tables.revenue_contribution_named]
    : [];

  const hv = revenue.find((r) => r?.Cluster_Name === "High-Value Loyal Customers");
  if (hv) return hv;

  revenue.sort((a, b) => (Number(b["Revenue_%"]) || 0) - (Number(a["Revenue_%"]) || 0));
  return revenue[0] ?? null;
}

export function getClusterNames(tables: any): string[] {
  const persona = Array.isArray(tables.persona_table) ? tables.persona_table : [];
  const names = persona.map((p: any) => p?.Cluster_Name).filter(Boolean);
  return Array.from(new Set(names));
}

/** ---------- Recommendations logic ---------- */
export function toActionBullets({
  personaRow,
  promoRow,
  riskRow,
  channelRow,
}: {
  personaRow?: any;
  promoRow?: any;
  riskRow?: any;
  channelRow?: any;
}) {
  const bullets: string[] = [];

  const action = String(personaRow?.Business_Action ?? "").trim();
  if (action) {
    const parts = action
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts.slice(0, 2)) bullets.push(p);
  }

  const pr = Number(promoRow?.Promo_Response_Rate);
  const dd = Number(promoRow?.Avg_Deal_Dependency);
  if (Number.isFinite(pr)) {
    if (pr >= 0.35) bullets.push("High promo responsiveness → use targeted offers + upsell bundles");
    else if (pr >= 0.18) bullets.push("Moderate promo response → test seasonal bundles (A/B)");
    else bullets.push("Low promo response → avoid blanket discounts; focus value messaging");
  }
  if (Number.isFinite(dd) && dd >= 0.25) bullets.push("High deal dependency → cap discounts + add guardrails");

  const risk = Number(riskRow?.Discount_Addicted_Rate);
  if (Number.isFinite(risk)) {
    if (risk >= 0.10) bullets.push("High discount addiction risk → exclude from heavy-discount campaigns");
    else if (risk > 0) bullets.push("Low risk → safe to test light incentives");
    else bullets.push("No discount addiction detected → prioritize premium/loyalty benefits");
  }

  const w = Number(channelRow?.Web_Purchase_Ratio);
  const s = Number(channelRow?.Store_Purchase_Ratio);
  const c = Number(channelRow?.Catalog_Purchase_Ratio);
  if ([w, s, c].some((x) => Number.isFinite(x))) {
    const max = Math.max(w || 0, s || 0, c || 0);
    if (max === (s || 0)) bullets.push("Channel: store-heavy → in-store offers + shelf visibility");
    else if (max === (w || 0)) bullets.push("Channel: web-heavy → retargeting + personalized web journeys");
    else if (max === (c || 0)) bullets.push("Channel: catalog-heavy → direct mail + curated catalog offers");
  }

  return Array.from(new Set(bullets)).slice(0, 3);
}

/** ---------- Decision banner + action tiles ---------- */
export function buildDecisionBanner({ tables }: { tables: any }) {
  const revenue = Array.isArray(tables.revenue_contribution_named) ? tables.revenue_contribution_named : [];
  const promo = Array.isArray(tables.promo_roi) ? tables.promo_roi : [];
  const risk = Array.isArray(tables.discount_risk) ? tables.discount_risk : [];

  if (!revenue.length || !promo.length) return "Focus on high-value segments with targeted incentives.";

  const hv = revenue.find((r: any) => r.Cluster_Name === "High-Value Loyal Customers") ?? revenue[0];
  const volume = revenue.find((r: any) => r.Cluster_Name === "Regular Family Shoppers") ?? revenue[1] ?? revenue[0];

  const hvPromo = promo.find((p: any) => p.Cluster_Name === hv.Cluster_Name)?.Promo_Response_Rate ?? 0;
  const volPromo = promo.find((p: any) => p.Cluster_Name === volume.Cluster_Name)?.Promo_Response_Rate ?? 0;

  const hvRisk = risk.find((r: any) => r.Cluster_Name === hv.Cluster_Name)?.Discount_Addicted_Rate ?? 0;

  if (hvPromo > volPromo && hvRisk < 0.05) {
    return `Shift promos from ${volume.Cluster_Name} to ${hv.Cluster_Name} to maximize ROI with low risk.`;
  }
  return `Prioritize ${hv.Cluster_Name} for premium/loyalty offers; keep ${volume.Cluster_Name} on bundles and seasonal campaigns.`;
}

export function buildActionTiles({ tables }: { tables: any }) {
  const promo = Array.isArray(tables.promo_roi) ? tables.promo_roi : [];
  const risk = Array.isArray(tables.discount_risk) ? tables.discount_risk : [];
  const channel = Array.isArray(tables.channel_strategy) ? tables.channel_strategy : [];

  const spotlight = pickSpotlightCluster(tables);
  const top = spotlight?.Cluster_Name;

  const riskiest = [...risk].sort(
    (a: any, b: any) => (b.Discount_Addicted_Rate ?? 0) - (a.Discount_Addicted_Rate ?? 0)
  )[0];

  const bestPromo = [...promo].sort(
    (a: any, b: any) => (b.Promo_Response_Rate ?? 0) - (a.Promo_Response_Rate ?? 0)
  )[0];

  const storeHeavy = [...channel].sort(
    (a: any, b: any) => (b.Store_Purchase_Ratio ?? 0) - (a.Store_Purchase_Ratio ?? 0)
  )[0];

  return [
    {
      title: "Top opportunity",
      bold: top ? `Double down on ${top}` : "Double down on top segment",
      sub: top ? "Highest revenue engine → retention + upsell" : "Revenue engine → retention + upsell",
    },
    {
      title: "Promo ROI action",
      bold: bestPromo?.Cluster_Name ? `Target promos: ${bestPromo.Cluster_Name}` : "Target promos to best responders",
      sub: bestPromo ? `Promo response: ${pct(bestPromo.Promo_Response_Rate, 1)}` : "Use targeted offers vs blanket",
    },
    {
      title: "Risk guardrail",
      bold: riskiest?.Cluster_Name ? `Guardrails for: ${riskiest.Cluster_Name}` : "Add discount guardrails",
      sub: riskiest ? `Discount addicted: ${pct(riskiest.Discount_Addicted_Rate, 1)}` : "Prevent addiction + margin loss",
    },
    {
      title: "Channel focus",
      bold: storeHeavy?.Cluster_Name ? `Store focus: ${storeHeavy.Cluster_Name}` : "Optimize channel mix",
      sub: storeHeavy ? `Store ratio: ${pct(storeHeavy.Store_Purchase_Ratio, 1)}` : "Align incentives to channels",
    },
  ];
}
