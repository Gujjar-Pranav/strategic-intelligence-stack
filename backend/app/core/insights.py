import pandas as pd

def compute_business_insights(df: pd.DataFrame) -> dict:
    # KPIs
    total_customers = int(df["ID"].nunique()) if "ID" in df.columns else int(len(df))
    total_revenue = float(df["Total_Spend"].sum())
    avg_spend = float(df["Total_Spend"].mean())

    promo_response_rate = float(df["Promo_Responsive"].mean()) if "Promo_Responsive" in df.columns else 0.0
    discount_addicted_rate = float(df["Discount_Addicted"].mean()) if "Discount_Addicted" in df.columns else 0.0

    kpis = {
        "total_customers": total_customers,
        "total_revenue": round(total_revenue, 2),
        "avg_spend_per_customer": round(avg_spend, 2),
        "promo_response_rate": round(promo_response_rate, 4),
        "discount_addicted_rate": round(discount_addicted_rate, 4),
    }

    # RFM overall (no clusters yet)
    rfm_overall = {
        "avg_recency": round(float(df["Recency_RFM"].mean()), 2),
        "avg_frequency": round(float(df["Frequency_RFM"].mean()), 2),
        "avg_monetary": round(float(df["Monetary_RFM"].mean()), 2),
    }

    # Promo ROI Indicators (overall)
    promo_roi_overall = {
        "promo_response_rate": round(float(df["Promo_Responsive"].mean()), 4),
        "avg_spend": round(float(df["Total_Spend"].mean()), 2),
        "avg_deal_dependency": round(float(df["Deal_Dependency"].mean()), 4),
    }

    # Channel Strategy (overall)
    channel_strategy_overall = {
        "avg_web_purchase_ratio": round(float(df["Web_Purchase_Ratio"].mean()), 4),
        "avg_store_purchase_ratio": round(float(df["Store_Purchase_Ratio"].mean()), 4),
        "avg_catalog_purchase_ratio": round(float(df["Catalog_Purchase_Ratio"].mean()), 4),
    }

    # Discount risk (overall)
    discount_risk_overall = {
        "discount_addicted_rate": round(float(df["Discount_Addicted"].mean()), 4),
        "median_avg_spend_per_purchase": round(float(df["Avg_Spend_Per_Purchase"].median()), 2),
        "median_deal_dependency": round(float(df["Deal_Dependency"].median()), 4),
    }

    # CLV proxy summary (overall)
    clv_overall = {
        "avg_clv_proxy": round(float(df["CLV_Proxy"].mean()), 2),
        "median_clv_proxy": round(float(df["CLV_Proxy"].median()), 2),
        "p90_clv_proxy": round(float(df["CLV_Proxy"].quantile(0.90)), 2),
    }

    # Optional: overall distributions (useful for drill-down UI later)
    marital_dist = None
    if "Marital_Status" in df.columns:
        marital_dist = (
            df["Marital_Status"].value_counts(normalize=True)
            .mul(100).round(2)
            .reset_index()
        )
        marital_dist.columns = ["marital_status", "percent"]
        marital_dist = marital_dist.to_dict("records")

    education_dist = None
    if "Education" in df.columns:
        education_dist = (
            df["Education"].value_counts(normalize=True)
            .mul(100).round(2)
            .reset_index()
        )
        education_dist.columns = ["education", "percent"]
        education_dist = education_dist.to_dict("records")

    return {
        "kpis": kpis,
        "rfm_overall": rfm_overall,
        "promo_roi_overall": promo_roi_overall,
        "channel_strategy_overall": channel_strategy_overall,
        "discount_risk_overall": discount_risk_overall,
        "clv_overall": clv_overall,
        "distributions": {
            "marital_status_pct": marital_dist,
            "education_pct": education_dist,
        },
    }
