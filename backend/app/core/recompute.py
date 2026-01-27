from __future__ import annotations

import io
import gzip
import json
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.preprocessing import RobustScaler, StandardScaler

from backend.app.core.clustering import FINAL_FEATURES
from backend.app.core.personas import attach_cluster_names, CLUSTER_NAMES
from backend.app.core.visuals import build_normalized_heatmap, build_pca_payload, build_cluster_bar_data
from backend.app.core.simulation_clusters import run_cluster_budget_simulation


def load_base_df(base_path: str) -> pd.DataFrame:
    with gzip.open(base_path, "rb") as f:
        raw_bytes = f.read()
    return pd.read_csv(io.BytesIO(raw_bytes))


def recompute_manifest_for_run(run_dir, params) -> dict:
    base_path = run_dir / "base.csv.gz"
    manifest_path = run_dir / "manifest.json"

    if not base_path.exists():
        raise FileNotFoundError("base.csv.gz not found")
    if not manifest_path.exists():
        raise FileNotFoundError("manifest.json not found")

    df_base = load_base_df(str(base_path))

    # Build X from the same contract features
    X = df_base[FINAL_FEATURES].copy()

    scaler = RobustScaler() if params.scaler.lower() == "robust" else StandardScaler()
    Xs = scaler.fit_transform(X)

    km = KMeans(n_clusters=params.k, random_state=42, n_init=10)
    labels = km.fit_predict(Xs)

    df_out = df_base.copy()
    df_out["Cluster"] = labels

    # Names: only meaningful for k=4
    if params.k == 4:
        df_out = attach_cluster_names(df_out)
    else:
        df_out["Cluster_Name"] = df_out["Cluster"].astype(int).map(lambda i: f"Cluster {i}")

    # Visuals
    heatmap = build_normalized_heatmap(df_out, FINAL_FEATURES)

    cc = df_out["Cluster"].value_counts().sort_index().reset_index()
    cc.columns = ["cluster_id", "customers"]
    cluster_bar = build_cluster_bar_data(cc.to_dict("records"))

    pca_payload = build_pca_payload(
        scaled_X=Xs,
        labels=labels,
        cluster_names=CLUSTER_NAMES if params.k == 4 else {},
        kmeans_centers_scaled=km.cluster_centers_,
        sample_size=params.pca_sample_size,
    )

    # Simulation only for k=4 personas
    simulation = None
    if params.k == 4:
        simulation = run_cluster_budget_simulation(
            df=df_out,
            source_cluster_name="Budget-Conscious Families",
            target_cluster_name="High-Value Loyal Customers",
            budget_shift_pct=params.budget_shift_pct,
            uplift_target=params.uplift_target,
            loss_source=params.loss_source,
        )

    # Load and update manifest
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["tuning_params"] = params.model_dump()

    manifest["visuals"]["heatmap"] = heatmap
    manifest["visuals"]["cluster_bar"] = cluster_bar
    manifest["visuals"]["pca"] = pca_payload
    manifest["simulation"] = simulation

    # Optional: also expose updated cluster counts
    manifest["tables"]["cluster_counts"] = cc.to_dict("records")

    # Save updated manifest
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return manifest
