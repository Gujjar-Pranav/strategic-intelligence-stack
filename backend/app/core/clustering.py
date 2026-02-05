import pandas as pd
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, silhouette_samples

FINAL_FEATURES = [
    "Income", "Age", "Total_Children",
    "Recency_RFM", "Frequency_RFM", "Monetary_RFM",
    "Avg_Spend_Per_Purchase", "Customer_Tenure",
    "Web_Purchase_Ratio", "Store_Purchase_Ratio",
    "Promo_Responsive", "Deal_Dependency",
    "Product_Variety",
]

def evaluate_scaler(X: pd.DataFrame, scaler, name: str, k: int = 4) -> dict:
    Xs = scaler.fit_transform(X)

    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = km.fit_predict(Xs)

    sil_mean = float(silhouette_score(Xs, labels))
    sil_samp = silhouette_samples(Xs, labels)
    neg_pct = float((sil_samp < 0).mean() * 100)

    props = pd.Series(labels).value_counts(normalize=True)
    return {
        "Scaler": name,
        "Silhouette_Mean": sil_mean,
        "Silhouette_Min": float(sil_samp.min()),
        "Negative_Silhouette_%": neg_pct,
        "Max_Cluster_%": float(props.max() * 100),
        "Min_Cluster_%": float(props.min() * 100),
        # keep internals for selected scaler
        "labels": labels,
        "Xs": Xs,
        "model": km,
        "scaler": scaler,
    }


def scaler_score(r: dict) -> float:
    # reward silhouette, penalize negative silhouettes
    return (r["Silhouette_Mean"] * 100.0) - (r["Negative_Silhouette_%"] * 2.0)


def run_kmeans_with_best_scaler(df: pd.DataFrame, k: int = 4) -> dict:
    # ensure features exist
    missing = [c for c in FINAL_FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required features for clustering: {missing}")

    X = df[FINAL_FEATURES].copy()

    res_std = evaluate_scaler(X, StandardScaler(), "StandardScaler", k=k)
    res_rob = evaluate_scaler(X, RobustScaler(), "RobustScaler", k=k)

    best = res_rob if scaler_score(res_rob) >= scaler_score(res_std) else res_std

    comparison = pd.DataFrame([
        {kk: vv for kk, vv in res_std.items() if kk not in ["labels", "Xs", "model", "scaler"]},
        {kk: vv for kk, vv in res_rob.items() if kk not in ["labels", "Xs", "model", "scaler"]},
    ]).round(4)

    # Attach labels to df
    df_out = df.copy()
    df_out["Cluster"] = best["labels"]

    # Cluster sizes
    cluster_counts = (
        df_out["Cluster"].value_counts()
        .sort_index()
        .reset_index()
    )
    cluster_counts.columns = ["cluster_id", "customers"]
    cluster_counts = cluster_counts.to_dict("records")

    # Cluster profile means for FINAL_FEATURES
    cluster_profile = (
        df_out.groupby("Cluster")[FINAL_FEATURES].mean().round(3).reset_index()
    )
    cluster_profile_records = cluster_profile.to_dict("records")

    # Revenue contribution by cluster (Total_Spend)
    revenue = (
        df_out.groupby("Cluster")
        .agg(Customers=("Cluster", "count"), Total_Revenue=("Total_Spend", "sum"))
        .reset_index()
    )
    revenue["Customer_%"] = (revenue["Customers"] / revenue["Customers"].sum() * 100).round(2)
    revenue["Revenue_%"] = (revenue["Total_Revenue"] / revenue["Total_Revenue"].sum() * 100).round(2)
    revenue = revenue.sort_values("Revenue_%", ascending=False)
    revenue_records = revenue.to_dict("records")

    return {
        "k": k,
        "final_features": FINAL_FEATURES,
        "scaler_comparison": comparison.to_dict("records"),
        "selected_scaler": best["Scaler"],
        "cluster_counts": cluster_counts,
        "cluster_profile": cluster_profile_records,
        "revenue_contribution": revenue_records,
        "df_with_clusters": df_out,  # returned for next steps (personas, pca, etc.)
        "kmeans_model": best["model"],
        "scaled_X": best["Xs"],
        "scaler": best["scaler"],
    }
