"use client";

import React from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export function ChartCard({
  title,
  subtitle,
  meta,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 break-inside-avoid print:break-inside-avoid">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-gray-700">{subtitle}</div>
          ) : null}
        </div>

        {/* Keep button behavior in app; hide only in print */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 print:hidden"
        >
          {open ? "Hide" : "View"}
          <ChevronDown
            size={14}
            className={clsx(
              "transition-transform",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </button>
      </div>

      {meta ? <div className="mt-3">{meta}</div> : null}

      {/* IMPORTANT:
         - In app: hidden when closed
         - In print: always shown
         - Print height is fixed so ResponsiveContainer measures correctly
      */}
      <div
        className={clsx(
          "exec-chart-body mt-3 rounded-xl bg-white",
          open ? "block" : "hidden",
          "print:block",
          // ✅ tighter in PDF so 2x2 charts fit on one page
          "h-72 print:h-[210px]",
          "break-inside-avoid print:break-inside-avoid"
        )}
      >
        {children}
      </div>

      {/* Fallback if Tailwind print utilities aren’t available */}
      <style jsx global>{`
        @media print {
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
