import pandas as pd

CLUSTER_NAMES = {
    0: "Budget-Conscious Families",
    1: "High-Value Loyal Customers",
    2: "Extreme / Outlier Customers",
    3: "Regular Family Shoppers",
}

CLUSTER_PERSONAS = {
    0: {
        "Persona": "Budget-Conscious Families",
        "Key_Traits": "Lower income, highest children count, low spend & frequency, store-heavy, deal-dependent",
        "Business_Action": "Value packs, coupons, in-store promotions, discount-led messaging",
    },
    1: {
        "Persona": "High-Value Loyal Customers",
        "Key_Traits": "Highest income, highest spend & frequency, high product variety, low deal dependency",
        "Business_Action": "Premium offers, loyalty rewards, exclusives, avoid heavy discounts",
    },
    2: {
        "Persona": "Extreme / Outlier Customers",
        "Key_Traits": "Very low income, near-zero purchases, extremely deal-dependent, tiny segment",
        "Business_Action": "Exclude from core campaigns; handle separately if needed",
    },
    3: {
        "Persona": "Regular Family Shoppers",
        "Key_Traits": "Mid income, moderate children, steady purchases, balanced channels, moderate promo sensitivity",
        "Business_Action": "Bundles, seasonal campaigns, cross-sell, family-oriented messaging",
    },
}

def attach_cluster_names(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["Cluster_Name"] = df["Cluster"].map(CLUSTER_NAMES).fillna("Unknown")
    return df

def build_persona_table() -> list[dict]:
    rows = []
    for cid, meta in CLUSTER_PERSONAS.items():
        rows.append(
            {
                "Cluster": cid,
                "Cluster_Name": CLUSTER_NAMES.get(cid, "Unknown"),
                "Persona": meta["Persona"],
                "Key_Traits": meta["Key_Traits"],
                "Business_Action": meta["Business_Action"],
            }
        )
    return rows

def _safe_mean_table(df: pd.DataFrame, group_col: str, cols: list[str], round_n: int) -> pd.DataFrame:
    cols_present = [c for c in cols if c in df.columns]
    if not cols_present:
        return pd.DataFrame({group_col: sorted(df[group_col].unique())})
    out = df.groupby(group_col)[cols_present].mean().round(round_n).reset_index()
    return out

def _safe_rate(df: pd.DataFrame, group_col: str, col: str, out_col: str, round_n: int = 3) -> pd.DataFrame:
    if col not in df.columns:
        return pd.DataFrame({group_col: sorted(df[group_col].unique()), out_col: [None] * df[group_col].nunique()})
    return (
        df.groupby(group_col)[col]
        .mean()
        .round(round_n)
        .reset_index()
        .rename(columns={col: out_col})
    )

def compute_cluster_tables(df: pd.DataFrame) -> dict:
    """
    Notebook-style tables by Cluster_Name.
    Requires df contains Cluster and Cluster_Name.
    Handles both:
      - raw mode (ID, Total_Spend, etc.)
      - features mode (only engineered FINAL_FEATURES)
    """
    if "Cluster_Name" not in df.columns:
        raise ValueError("compute_cluster_tables requires df['Cluster_Name'].")

    # Revenue contribution by cluster
    has_id = "ID" in df.columns

    # Customers: ID count if available, else row count
    customers_series = df.groupby("Cluster_Name")["ID"].count() if has_id else df.groupby("Cluster_Name").size()
    customers = customers_series.rename("Customers").reset_index()

    # Revenue: Total_Spend if available, else Monetary_RFM proxy (features mode)
    revenue_is_proxy = False
    if "Total_Spend" in df.columns:
        revenue_series = df.groupby("Cluster_Name")["Total_Spend"].sum()
    elif "Monetary_RFM" in df.columns:
        revenue_series = df.groupby("Cluster_Name")["Monetary_RFM"].sum()
        revenue_is_proxy = True
    else:
        revenue_series = pd.Series(0.0, index=customers["Cluster_Name"])

    revenue = revenue_series.rename("Total_Revenue").reset_index()

    revenue_contribution = customers.merge(revenue, on="Cluster_Name", how="left")
    revenue_contribution["Customer_%"] = (
        revenue_contribution["Customers"] / max(1, revenue_contribution["Customers"].sum()) * 100
    ).round(2)

    total_rev = float(revenue_contribution["Total_Revenue"].sum())
    revenue_contribution["Revenue_%"] = (
        revenue_contribution["Total_Revenue"] / (total_rev if total_rev != 0 else 1.0) * 100
    ).round(2)

    revenue_contribution = revenue_contribution.sort_values("Revenue_%", ascending=False)

    # RFM summary (always available in features mode)
    rfm_summary = _safe_mean_table(
        df,
        "Cluster_Name",
        ["Recency_RFM", "Frequency_RFM", "Monetary_RFM"],
        round_n=2,
    )

    # Promo ROI
    # In raw mode Avg_Spend = Total_Spend mean
    # In features mode fallback Avg_Spend = Monetary_RFM mean (proxy)
    promo_roi = df.groupby("Cluster_Name").agg(
        Promo_Response_Rate=("Promo_Responsive", "mean"),
        Avg_Deal_Dependency=("Deal_Dependency", "mean"),
    )

    if "Total_Spend" in df.columns:
        promo_roi["Avg_Spend"] = df.groupby("Cluster_Name")["Total_Spend"].mean()
    elif "Monetary_RFM" in df.columns:
        promo_roi["Avg_Spend"] = df.groupby("Cluster_Name")["Monetary_RFM"].mean()
    else:
        promo_roi["Avg_Spend"] = None

    promo_roi = (
        promo_roi.round(3)
        .reset_index()
        .sort_values("Promo_Response_Rate", ascending=False)
    )

    # Channel strategy matrix
    # Catalog_Purchase_Ratio exists only in raw mode; keep if present.
    channel_cols = ["Web_Purchase_Ratio", "Store_Purchase_Ratio", "Catalog_Purchase_Ratio"]
    channel_strategy = _safe_mean_table(df, "Cluster_Name", channel_cols, round_n=3)

    # Discount addiction risk
    # Exists only if computed upstream.If missing: return None values rather than crash.
    discount_risk = _safe_rate(df, "Cluster_Name", "Discount_Addicted", "Discount_Addicted_Rate", round_n=3)

    # CLV proxy summary
    # Exists only if computed upstream.If missing: return None values rather than crash.
    if "CLV_Proxy" in df.columns:
        clv_summary = (
            df.groupby("Cluster_Name")["CLV_Proxy"]
            .mean()
            .round(0)
            .reset_index()
            .rename(columns={"CLV_Proxy": "Avg_CLV_Proxy"})
            .sort_values("Avg_CLV_Proxy", ascending=False)
        )
    else:
        clv_summary = pd.DataFrame(
            {"Cluster_Name": sorted(df["Cluster_Name"].unique()), "Avg_CLV_Proxy": [None] * df["Cluster_Name"].nunique()}
        )

    # Cluster summary
    # In features-only mode, remove columns that don't exist.
    # Avg_Total_Spend uses Total_Spend if present else Monetary_RFM proxy.

    agg_map = {
        "Avg_Income": ("Income", "mean") if "Income" in df.columns else None,
        "Avg_Frequency": ("Frequency_RFM", "mean") if "Frequency_RFM" in df.columns else None,
        "Avg_Recency": ("Recency_RFM", "mean") if "Recency_RFM" in df.columns else None,
        "Avg_Deal_Dependency": ("Deal_Dependency", "mean") if "Deal_Dependency" in df.columns else None,
        "Avg_Product_Variety": ("Product_Variety", "mean") if "Product_Variety" in df.columns else None,
        "Promo_Response_Rate": ("Promo_Responsive", "mean") if "Promo_Responsive" in df.columns else None,
        "Avg_Web_Ratio": ("Web_Purchase_Ratio", "mean") if "Web_Purchase_Ratio" in df.columns else None,
        "Avg_Store_Ratio": ("Store_Purchase_Ratio", "mean") if "Store_Purchase_Ratio" in df.columns else None,
    }

    spend_col = "Total_Spend" if "Total_Spend" in df.columns else ("Monetary_RFM" if "Monetary_RFM" in df.columns else None)

    group_cols = ["Cluster_Name"]
    if "Cluster" in df.columns:
        group_cols = ["Cluster", "Cluster_Name"]

    group = df.groupby(group_cols)

    # Customers
    if has_id:
        customers_series2 = group["ID"].count()
    else:
        customers_series2 = group.size()
    cluster_summary = customers_series2.rename("Customers").reset_index()

    # Add summary metrics safely
    for out_col, spec in agg_map.items():
        if spec is None:
            cluster_summary[out_col] = None
            continue
        src, fn = spec
        cluster_summary[out_col] = group[src].agg(fn).values

    # Add spend metric
    if spend_col is not None:
        cluster_summary["Avg_Total_Spend"] = group[spend_col].mean().values
    else:
        cluster_summary["Avg_Total_Spend"] = None

    cluster_summary["Customer_%"] = (cluster_summary["Customers"] / max(1, len(df)) * 100).round(2)

    # Rounding
    for c in ["Avg_Income", "Avg_Total_Spend", "Avg_Frequency", "Avg_Recency"]:
        if c in cluster_summary.columns:
            cluster_summary[c] = pd.to_numeric(cluster_summary[c], errors="coerce").round(2)
    for c in ["Avg_Deal_Dependency", "Avg_Product_Variety", "Promo_Response_Rate", "Avg_Web_Ratio", "Avg_Store_Ratio"]:
        if c in cluster_summary.columns:
            cluster_summary[c] = pd.to_numeric(cluster_summary[c], errors="coerce").round(3)

    cluster_summary = cluster_summary.sort_values("Customers", ascending=False)

    return {
        "persona_table": build_persona_table(),
        "revenue_contribution_named": revenue_contribution.reset_index(drop=True).to_dict("records"),
        "rfm_summary": rfm_summary.to_dict("records"),
        "promo_roi": promo_roi.to_dict("records"),
        "channel_strategy": channel_strategy.to_dict("records"),
        "discount_risk": discount_risk.to_dict("records"),
        "clv_summary": clv_summary.to_dict("records"),
        "cluster_summary": cluster_summary.to_dict("records"),
        # extra metadata for UI
        "meta": {
            "revenue_is_proxy": revenue_is_proxy,
            "revenue_proxy_source": "Monetary_RFM" if revenue_is_proxy else "Total_Spend",
            "customers_source": "ID" if has_id else "row_count",
        },
    }
