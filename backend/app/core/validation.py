from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Tuple
import pandas as pd

# Column normalization helpers

def _norm(s: str) -> str:
    # normalize for matching: lowercase, remove non-alphanum
    return re.sub(r"[^a-z0-9]+", "", str(s).strip().lower())

def normalize_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
    """
    Returns a copy of df with normalized-renamed columns when possible.
    mapping: normalized_key -> actual_df_column_name
    """
    cols = list(df.columns)
    norm_map = {_norm(c): c for c in cols}
    return df, norm_map


#  Validation contract

FINAL_FEATURES = [
    "Income", "Age", "Total_Children",
    "Recency_RFM", "Frequency_RFM", "Monetary_RFM",
    "Avg_Spend_Per_Purchase", "Customer_Tenure",
    "Web_Purchase_Ratio", "Store_Purchase_Ratio",
    "Promo_Responsive", "Deal_Dependency", "Product_Variety",
]

# raw columns needed to build FINAL_FEATURES (minimum)
RAW_REQUIRED = [
    "Income",
    "Year_Birth",
    "Kidhome",
    "Teenhome",
    "Dt_Customer",
    "Recency",
    "NumWebPurchases",
    "NumStorePurchases",
    "NumCatalogPurchases",
    "NumDealsPurchases",
    "MntWines",
    "MntFruits",
    "MntMeatProducts",
    "MntFishProducts",
    "MntSweetProducts",
    "MntGoldProds",
    "AcceptedCmp1",
    "AcceptedCmp2",
    "AcceptedCmp3",
    "AcceptedCmp4",
    "AcceptedCmp5",
    "Response",
]

# common header aliases users might upload (you can extend this over time)
ALIASES: Dict[str, List[str]] = {
    "Year_Birth": ["yearbirth", "birthyear", "yearofbirth", "dobyear"],
    "Dt_Customer": ["dtcustomer", "datecustomer", "customerdate", "datejoined", "join_date", "joined"],
    "NumWebPurchases": ["numwebpurchases", "webpurchases", "web_purchases"],
    "NumStorePurchases": ["numstorepurchases", "storepurchases", "store_purchases"],
    "NumCatalogPurchases": ["numcatalogpurchases", "catalogpurchases", "catalog_purchases"],
    "NumDealsPurchases": ["numdealspurchases", "dealspurchases", "deals_purchases"],
    "MntWines": ["mntwines", "winespend", "wine_spend"],
    "MntFruits": ["mntfruits", "fruitspend", "fruits_spend"],
    "MntMeatProducts": ["mntmeatproducts", "meatspend", "meat_spend"],
    "MntFishProducts": ["mntfishproducts", "fishspend", "fish_spend"],
    "MntSweetProducts": ["mntsweetproducts", "sweetspend", "sweets_spend"],
    "MntGoldProds": ["mntgoldprods", "goldspend", "gold_spend"],
    "Kidhome": ["kidhome", "kids_home", "kidsathome"],
    "Teenhome": ["teenhome", "teens_home", "teensathome"],
}

@dataclass
class ValidationResult:
    mode: str  # "raw" or "features"
    ok: bool
    missing: List[str]
    renamed: Dict[str, str]  # canonical -> actual
    message: str

def detect_and_validate(df: pd.DataFrame) -> ValidationResult:
    df, norm_map = normalize_columns(df)

    # Helper: find canonical in df via exact or alias
    def find_col(canonical: str) -> str | None:
        # exact
        if canonical in df.columns:
            return canonical
        # by normalization exact match
        n = _norm(canonical)
        if n in norm_map:
            return norm_map[n]
        # by alias normalization
        for a in ALIASES.get(canonical, []):
            if _norm(a) in norm_map:
                return norm_map[_norm(a)]
        return None

    # 1) If all FINAL_FEATURES exist (feature-ready mode)
    feature_hits = {c: find_col(c) for c in FINAL_FEATURES}
    if all(feature_hits[c] is not None for c in FINAL_FEATURES):
        return ValidationResult(
            mode="features",
            ok=True,
            missing=[],
            renamed={c: feature_hits[c] for c in FINAL_FEATURES},
            message="Detected engineered-feature dataset (FINAL_FEATURES present).",
        )

    # 2) Otherwise, require RAW_REQUIRED
    raw_hits = {c: find_col(c) for c in RAW_REQUIRED}
    missing = [c for c, got in raw_hits.items() if got is None]
    if missing:
        msg = (
            "Upload is missing required columns for feature engineering. "
            "Either upload the raw marketing dataset (required raw columns), "
            "or upload a sheet that already contains the engineered FINAL_FEATURES."
        )
        return ValidationResult(
            mode="raw",
            ok=False,
            missing=missing,
            renamed={c: raw_hits[c] for c in RAW_REQUIRED if raw_hits[c] is not None},
            message=msg,
        )

    return ValidationResult(
        mode="raw",
        ok=True,
        missing=[],
        renamed={c: raw_hits[c] for c in RAW_REQUIRED},
        message="Detected raw dataset (required columns present).",
    )

def apply_renames(df: pd.DataFrame, renamed: Dict[str, str]) -> pd.DataFrame:
    """
    renamed: canonical -> actual. We rename actual columns to canonical names.
    """
    inv = {actual: canonical for canonical, actual in renamed.items() if actual != canonical}
    if not inv:
        return df
    return df.rename(columns=inv)
