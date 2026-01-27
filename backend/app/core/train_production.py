from __future__ import annotations

import pandas as pd
from pathlib import Path

from backend.app.core.pipeline import build_features
from backend.app.core.clustering import run_kmeans_with_best_scaler, FINAL_FEATURES
from backend.app.core.personas import CLUSTER_NAMES
from backend.app.core.model_store import ModelBundle, bundle_path, save_bundle, utc_now_iso


def train_and_save_production_bundle(
    demo_data_path: Path,
    version: str = "v1",
) -> dict:
    raw_df = pd.read_excel(demo_data_path, engine="openpyxl")
    df, report = build_features(raw_df)

    clustering = run_kmeans_with_best_scaler(df, k=4)

    bundle = ModelBundle(
        version=version,
        trained_at_utc=utc_now_iso(),
        k=4,
        final_features=FINAL_FEATURES,
        selected_scaler=clustering["selected_scaler"],
        cluster_names=CLUSTER_NAMES,
        scaler=clustering["scaler"],
        kmeans=clustering["kmeans_model"],
    )

    path = bundle_path(version)
    save_bundle(bundle, path)

    return {
        "bundle_path": str(path),
        "bundle_meta": bundle.to_dict(),
        "data_quality_report": report,
    }
