"use client";

import React from "react";
import clsx from "clsx";
import { Upload, Sparkles } from "lucide-react";

export function Header({
  onLoadDemo,
  onFileSelected,
}: {
  onLoadDemo: () => void;
  onFileSelected: (file: File) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: Title */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] text-gray-700">
            <Sparkles size={14} />
            Premium Analytics Console
          </div>

          <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-gray-900">
            Customer Segmentation Intelligence
          </h1>

          <div className="mt-1 text-xs text-gray-500 truncate">
            Backend: <span className="font-medium text-gray-700">{baseUrl}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLoadDemo}
            className={clsx(
              "h-10 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900",
              "hover:bg-gray-50 active:scale-[0.99] transition"
            )}
          >
            Load Demo
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              "h-10 rounded-full bg-gray-900 px-4 text-sm font-medium text-white",
              "hover:bg-black active:scale-[0.99] transition inline-flex items-center gap-2"
            )}
          >
            <Upload size={16} />
            Upload
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              onFileSelected(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
