"use client";

import React from "react";
import clsx from "clsx";
import { BarChart3, FileDown, Layers, Table2, SlidersHorizontal } from "lucide-react";
import type { TabKey } from "../types";

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition",
        active ? "bg-black text-white border-black" : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function Tabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <TabButton
        active={activeTab === "overview"}
        onClick={() => setActiveTab("overview")}
        icon={<BarChart3 size={16} />}
        label="Overview"
      />
      <TabButton
        active={activeTab === "segments"}
        onClick={() => setActiveTab("segments")}
        icon={<Layers size={16} />}
        label="Segments"
      />
      <TabButton
        active={activeTab === "tables"}
        onClick={() => setActiveTab("tables")}
        icon={<Table2 size={16} />}
        label="Tables"
      />
      <TabButton
        active={activeTab === "simulation"}
        onClick={() => setActiveTab("simulation")}
        icon={<SlidersHorizontal size={16} />}
        label="Simulation"
      />
      <TabButton
        active={activeTab === "exports"}
        onClick={() => setActiveTab("exports")}
        icon={<FileDown size={16} />}
        label="Exports"
      />
    </div>
  );
}
