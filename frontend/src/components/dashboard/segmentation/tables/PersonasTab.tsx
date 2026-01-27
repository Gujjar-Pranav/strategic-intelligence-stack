"use client";

import React from "react";
import { DataTable } from "./DataTable";

export function PersonasTab({ tables }: { tables: any }) {
  const rows = tables?.persona_table;
  if (!Array.isArray(rows)) return <div className="text-sm text-gray-900">No persona table available.</div>;
  return <DataTable title="Personas" rows={rows} />;
}
