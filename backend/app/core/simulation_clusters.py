import pandas as pd


def run_cluster_budget_simulation(
    df: pd.DataFrame,
    source_cluster_name: str,
    target_cluster_name: str,
    budget_shift_pct: float,
    uplift_target: float,
    loss_source: float,
) -> dict:
    """
    Notebook-style simulation based on real clusters.
    Works for:
      - raw mode (Total_Spend exists)
      - features-only mode (fallback to Monetary_RFM as revenue proxy)
    """

    # Revenue column (raw vs features)
    revenue_col = "Total_Spend" if "Total_Spend" in df.columns else "Monetary_RFM"
    revenue_is_proxy = revenue_col != "Total_Spend"

    # Total revenue must use the chosen revenue column (NOT hardcoded Total_Spend)
    total_revenue = float(df[revenue_col].sum() or 0.0)

    # Customers count (raw vs features)
    if "ID" in df.columns:
        cust_agg = ("ID", "count")
    else:
        # counts rows per cluster
        cust_agg = ("Cluster_Name", "size")

    # Base revenue by cluster
    revenue_base = (
        df.groupby("Cluster_Name")
        .agg(
            Customers=cust_agg,
            Total_Revenue=(revenue_col, "sum"),
        )
        .reset_index()
    )

    if source_cluster_name not in revenue_base["Cluster_Name"].values:
        raise ValueError(f"Source cluster not found: {source_cluster_name}")

    if target_cluster_name not in revenue_base["Cluster_Name"].values:
        raise ValueError(f"Target cluster not found: {target_cluster_name}")

    rev_source = float(
        revenue_base.loc[revenue_base["Cluster_Name"] == source_cluster_name, "Total_Revenue"].values[0]
    )
    rev_target = float(
        revenue_base.loc[revenue_base["Cluster_Name"] == target_cluster_name, "Total_Revenue"].values[0]
    )

    # Notebook-style impact
    revenue_loss = rev_source * loss_source * budget_shift_pct
    revenue_gain = rev_target * uplift_target * budget_shift_pct
    net_revenue_change = revenue_gain - revenue_loss

    summary_table = [
        {"metric": "Current Total Revenue", "amount": round(total_revenue, 2)},
        {"metric": "Revenue Lost (Source Cluster)", "amount": round(-revenue_loss, 2)},
        {"metric": "Revenue Gained (Target Cluster)", "amount": round(revenue_gain, 2)},
        {"metric": "Net Revenue Impact", "amount": round(net_revenue_change, 2)},
    ]

    chart_data = [
        {"metric": "Revenue Loss", "value": round(-revenue_loss, 2)},
        {"metric": "Revenue Gain", "value": round(revenue_gain, 2)},
        {"metric": "Net Impact", "value": round(net_revenue_change, 2)},
    ]

    return {
        "assumptions": {
            "source_cluster": source_cluster_name,
            "target_cluster": target_cluster_name,
            "budget_shift_pct": budget_shift_pct,
            "uplift_target": uplift_target,
            "loss_source": loss_source,
            # helpful for UI + transparency
            "revenue_col_used": revenue_col,
            "revenue_is_proxy": revenue_is_proxy,
        },
        "revenues": {
            "source_cluster_revenue": round(rev_source, 2),
            "target_cluster_revenue": round(rev_target, 2),
            "total_revenue": round(total_revenue, 2),
        },
        "summary_table": summary_table,
        "chart_data": chart_data,
    }
