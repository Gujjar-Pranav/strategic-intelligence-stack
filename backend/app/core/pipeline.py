import numpy as np
import pandas as pd
from datetime import datetime

def clean_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    report = {}

    # Datetime parsing
    if "Dt_Customer" in df.columns:
        df["Dt_Customer"] = pd.to_datetime(df["Dt_Customer"], errors="coerce")

    # Missing + zeros summary
    missing_counts = df.isnull().sum()
    missing_pct = (missing_counts / len(df) * 100).round(2)
    missing_summary = (
        pd.DataFrame({"Missing_Value_Count": missing_counts, "Missing_value_percentage": missing_pct})
        .query("Missing_Value_Count > 0")
        .sort_values("Missing_value_percentage", ascending=False)
    )

    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    zero_counts = (df[num_cols] == 0).sum()
    zero_pct = (zero_counts / len(df) * 100).round(2)
    zero_summary = (
        pd.DataFrame({"Zero_Count": zero_counts, "Zero_Percentage": zero_pct})
        .query("Zero_Count > 0")
        .sort_values("Zero_Percentage", ascending=False)
    )

    report["missing_summary"] = missing_summary.reset_index().rename(columns={"index": "column"}).to_dict("records")
    report["zero_summary"] = zero_summary.reset_index().rename(columns={"index": "column"}).to_dict("records")

    # Income cleaning (Income=0 -> NaN -> median)
    if "Income" in df.columns:
        income_zeros = int((df["Income"] == 0).sum())
        df.loc[df["Income"] == 0, "Income"] = np.nan
        median_income = float(df["Income"].median())
        df["Income"] = df["Income"].fillna(median_income)

        report["income_imputation"] = {
            "income_zeros_converted_to_nan": income_zeros,
            "median_income_used": round(median_income, 2),
        }

    # Drop corrupted IDs if any
    if "ID" in df.columns:
        before = len(df)
        df = df[df["ID"] != 0].copy()
        report["removed_id_0_rows"] = int(before - len(df))

    # Drop constant columns
    constant_cols = [c for c in df.columns if df[c].nunique(dropna=False) == 1]
    if constant_cols:
        df = df.drop(columns=constant_cols)
    report["dropped_constant_columns"] = constant_cols

    # Duplicates
    duplicates = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)
    report["duplicates_removed"] = duplicates

    report["shape_after_cleaning"] = {"rows": int(df.shape[0]), "cols": int(df.shape[1])}

    return df, report

def cap_outliers_iqr(df: pd.DataFrame) -> pd.DataFrame:
    cap_cols = [
        "Income",
        "MntWines", "MntFruits", "MntMeatProducts", "MntFishProducts",
        "MntSweetProducts", "MntGoldProds",
        "NumWebPurchases", "NumCatalogPurchases", "NumWebVisitsMonth",
    ]

    for col in cap_cols:
        if col not in df.columns:
            continue

        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        df[col] = df[col].clip(lower, upper)

    return df

def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    # Age
    if "Year_Birth" in df.columns:
        df["Age"] = datetime.now().year - df["Year_Birth"]
        df["Age"] = df["Age"].clip(lower=10, upper=100)

    # Total Children
    if "Kidhome" in df.columns and "Teenhome" in df.columns:
        df["Total_Children"] = df["Kidhome"] + df["Teenhome"]

    # Spend
    spend_cols = ["MntWines", "MntFruits", "MntMeatProducts", "MntFishProducts", "MntSweetProducts", "MntGoldProds"]
    existing_spend_cols = [c for c in spend_cols if c in df.columns]
    df["Total_Spend"] = df[existing_spend_cols].sum(axis=1)

    # Purchases
    purchase_cols = ["NumWebPurchases", "NumCatalogPurchases", "NumStorePurchases"]
    existing_purchase_cols = [c for c in purchase_cols if c in df.columns]
    df["Total_Purchases"] = df[existing_purchase_cols].sum(axis=1)

    # Customer tenure
    if "Dt_Customer" in df.columns:
        df["Customer_Tenure"] = (datetime.now() - df["Dt_Customer"]).dt.days

    # Campaign accepted
    campaign_cols = ["AcceptedCmp1", "AcceptedCmp2", "AcceptedCmp3", "AcceptedCmp4", "AcceptedCmp5", "Response"]
    existing_campaign_cols = [c for c in campaign_cols if c in df.columns]
    df["Total_Campaign_Accepted"] = df[existing_campaign_cols].sum(axis=1)

    # RFM style
    if "Recency" in df.columns:
        df["Recency_RFM"] = df["Recency"]
    df["Frequency_RFM"] = df["Total_Purchases"]
    df["Monetary_RFM"] = df["Total_Spend"]

    # Ratios + behavior
    df["Web_Purchase_Ratio"] = df.get("NumWebPurchases", 0) / (df["Total_Purchases"] + 1)
    df["Store_Purchase_Ratio"] = df.get("NumStorePurchases", 0) / (df["Total_Purchases"] + 1)
    df["Catalog_Purchase_Ratio"] = df.get("NumCatalogPurchases", 0) / (df["Total_Purchases"] + 1)

    df["Avg_Spend_Per_Purchase"] = df["Total_Spend"] / (df["Total_Purchases"] + 1)

    # Flags
    df["Has_Children"] = (df.get("Total_Children", 0) > 0).astype(int)
    df["Promo_Responsive"] = (df["Total_Campaign_Accepted"] > 0).astype(int)

    # Deal Dependency
    df["Deal_Dependency"] = df.get("NumDealsPurchases", 0) / (df["Total_Purchases"] + 1)

    # Product variety
    product_cols = ["MntWines", "MntFruits", "MntMeatProducts", "MntFishProducts", "MntSweetProducts", "MntGoldProds"]
    existing_product_cols = [c for c in product_cols if c in df.columns]
    df["Product_Variety"] = (df[existing_product_cols] > 0).sum(axis=1)

    # Discount addiction index
    df["Discount_Addicted"] = (
        (df["Deal_Dependency"] > 0.5) &
        (df["Avg_Spend_Per_Purchase"] < df["Avg_Spend_Per_Purchase"].median())
    ).astype(int)

    # CLV proxy
    df["CLV_Proxy"] = df["Avg_Spend_Per_Purchase"] * df["Frequency_RFM"] * df.get("Customer_Tenure", 0)

    return df

def build_features(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    df, report = clean_data(df)
    df = cap_outliers_iqr(df)
    df = feature_engineering(df)

    report["final_shape_with_features"] = {"rows": int(df.shape[0]), "cols": int(df.shape[1])}
    return df, report
