"use client";

import React from "react";
import { DataTable } from "./DataTable";

export function ClusterTab({ tables }: { tables: any }) {
  const rows = tables?.cluster_summary;
  if (!Array.isArray(rows)) return <div className="text-sm text-gray-900">No cluster summary available.</div>;
  return <DataTable title="Cluster summary" rows={rows} />;
}
