"use client";

import React from "react";

export function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          {hint ? <div className="mt-1 text-xs text-gray-700">{hint}</div> : null}
        </div>
        <div className="text-sm font-semibold text-gray-900">{format ? format(value) : value.toFixed(2)}</div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
        />
      </div>
    </div>
  );
}
