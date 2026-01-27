"use client";

import React from "react";
import clsx from "clsx";
import { Sparkles, Target, ShieldAlert, TrendingUp } from "lucide-react";

type Tone = "good" | "risk" | "neutral";

function getTone(text: string): Tone {
  const t = (text ?? "").toLowerCase();

  if (t.includes("maximize") || t.includes("maximize roi") || t.includes("shift promos") || t.includes("double down")) {
    return "good";
  }

  if (t.includes("risk") || t.includes("guardrail") || t.includes("exclude")) {
    return "risk";
  }

  return "neutral";
}

function toneClasses(tone: Tone) {
  switch (tone) {
    case "good":
      return {
        shell: "border-emerald-200 bg-emerald-50",
        badge: "border-emerald-200 bg-white text-emerald-700",
        icon: "text-emerald-700",
      };
    case "risk":
      return {
        shell: "border-rose-200 bg-rose-50",
        badge: "border-rose-200 bg-white text-rose-700",
        icon: "text-rose-700",
      };
    default:
      return {
        shell: "border-gray-200 bg-white",
        badge: "border-gray-200 bg-gray-50 text-gray-700",
        icon: "text-gray-900",
      };
  }
}

function Chip({
  icon,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: Tone;
}) {
  const c = toneClasses(tone);
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium",
        c.badge
      )}
    >
      {icon}
      {label}
    </div>
  );
}

export function DecisionBanner({
  decisionBanner,
  meta,
}: {
  decisionBanner: string;
  meta?: {
    tone?: Tone;
    tags?: string[]; // optional, for PDF-style labeling if you want later
  };
}) {
  const tone = meta?.tone ?? getTone(decisionBanner);
  const c = toneClasses(tone);

  return (
    <div className={clsx("rounded-2xl border p-5", c.shell)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-[260px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-700">
            <Sparkles size={14} className={clsx(c.icon)} />
            Executive decision
          </div>

          <div className="mt-3 text-sm font-semibold text-gray-900 leading-snug">
            {decisionBanner}
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Auto-generated from <b>Revenue Contribution</b> + <b>Promo ROI</b> +{" "}
            <b>Discount Risk</b>.
          </div>

          {/* Optional tags (future-proof for PDF) */}
          {meta?.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {meta.tags.slice(0, 4).map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-700"
                >
                  {t}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Chip icon={<Target size={14} className={clsx(c.icon)} />} label="Strategy" tone={tone} />
          <Chip icon={<TrendingUp size={14} className={clsx(c.icon)} />} label="Revenue impact" tone={tone} />
          <Chip icon={<ShieldAlert size={14} className={clsx(c.icon)} />} label="Risk guardrails" tone={tone} />
        </div>
      </div>
    </div>
  );
}
