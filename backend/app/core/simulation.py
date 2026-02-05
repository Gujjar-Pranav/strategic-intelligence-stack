import pandas as pd

def run_budget_simulation(
    df: pd.DataFrame,
    budget_shift_pct: float,
    uplift_target: float,
    loss_source: float,
) -> dict:
    total_revenue = float(df["Total_Spend"].sum())

    deal_median = float(df["Deal_Dependency"].median())
    clv_median = float(df["CLV_Proxy"].median())

    source_df = df[df["Deal_Dependency"] >= deal_median]
    target_df = df[df["CLV_Proxy"] >= clv_median]

    rev_source = float(source_df["Total_Spend"].sum())
    rev_target = float(target_df["Total_Spend"].sum())

    revenue_loss = rev_source * loss_source * budget_shift_pct
    revenue_gain = rev_target * uplift_target * budget_shift_pct
    net_revenue_change = revenue_gain - revenue_loss

    summary_table = [
        {"metric": "Current Total Revenue", "amount": round(total_revenue, 2)},
        {"metric": "Revenue Lost (Source Segment)", "amount": round(-revenue_loss, 2)},
        {"metric": "Revenue Gained (Target Segment)", "amount": round(revenue_gain, 2)},
        {"metric": "Net Revenue Impact", "amount": round(net_revenue_change, 2)},
    ]

    chart_data = [
        {"metric": "Revenue Loss", "value": round(-revenue_loss, 2)},
        {"metric": "Revenue Gain", "value": round(revenue_gain, 2)},
        {"metric": "Net Impact", "value": round(net_revenue_change, 2)},
    ]

    return {
        "assumptions": {
            "budget_shift_pct": budget_shift_pct,
            "uplift_target": uplift_target,
            "loss_source": loss_source,
        },
        "segments_used": {
            "source_rule": "Deal_Dependency >= median(Deal_Dependency)",
            "target_rule": "CLV_Proxy >= median(CLV_Proxy)",
            "source_revenue": round(rev_source, 2),
            "target_revenue": round(rev_target, 2),
        },
        "summary_table": summary_table,
        "chart_data": chart_data,
    }
