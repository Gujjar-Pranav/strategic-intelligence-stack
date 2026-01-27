export function simulateLocalFromTables(tables: any, payload: any) {
  const source = payload?.simulation?.assumptions?.source_cluster;
  const target = payload?.simulation?.assumptions?.target_cluster;
  const budget_shift_pct = Number(payload?.simulation?.assumptions?.budget_shift_pct ?? 0);
  const uplift_target = Number(payload?.simulation?.assumptions?.uplift_target ?? 0);
  const loss_source = Number(payload?.simulation?.assumptions?.loss_source ?? 0);

  const rev = Array.isArray(tables?.revenue_contribution_named) ? tables.revenue_contribution_named : [];
  const pickRev = (r: any) => Number(r?.Total_Revenue ?? r?.Total_Spend ?? r?.Revenue ?? 0);

  const sourceRev = pickRev(rev.find((r: any) => r.Cluster_Name === source));
  const targetRev = pickRev(rev.find((r: any) => r.Cluster_Name === target));
  const totalRev = rev.reduce((s: number, r: any) => s + pickRev(r), 0);

  const lost = -(sourceRev * budget_shift_pct * loss_source);
  const gained = targetRev * budget_shift_pct * uplift_target;
  const net = gained + lost;

  return {
    mode: "upload_local",
    simulation: {
      assumptions: payload.simulation.assumptions,
      revenues: {
        source_cluster_revenue: sourceRev,
        target_cluster_revenue: targetRev,
        total_revenue: totalRev,
      },
      summary_table: [
        { metric: "Current Total Revenue", amount: totalRev },
        { metric: "Revenue Lost (Source Cluster)", amount: Number(lost.toFixed(2)) },
        { metric: "Revenue Gained (Target Cluster)", amount: Number(gained.toFixed(2)) },
        { metric: "Net Revenue Impact", amount: Number(net.toFixed(2)) },
      ],
      chart_data: [
        { metric: "Revenue Loss", value: Number(lost.toFixed(2)) },
        { metric: "Revenue Gain", value: Number(gained.toFixed(2)) },
        { metric: "Net Impact", value: Number(net.toFixed(2)) },
      ],
    },
  };
}

export function normalizeDemoSummaryLabels(summary: any[]) {
  return summary.map((r: any) => {
    const m = String(r?.metric ?? "");
    return {
      ...r,
      metric: m
        .replace("Revenue Lost (Source Segment)", "Revenue Lost (Source Cluster)")
        .replace("Revenue Gained (Target Segment)", "Revenue Gained (Target Cluster)"),
    };
  });
}
