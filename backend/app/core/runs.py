from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import uuid
import json
import pandas as pd
import io
import gzip

from datetime import datetime, timezone

from backend.app.core.model_store import load_bundle, bundle_path
from backend.app.core.pipeline import build_features
from backend.app.core.personas import attach_cluster_names, compute_cluster_tables, CLUSTER_NAMES
from backend.app.core.visuals import build_normalized_heatmap, build_pca_payload, build_cluster_bar_data
from backend.app.core.simulation_clusters import run_cluster_budget_simulation
from backend.app.core.ttl import compute_expires_at

RUNS_DIR = Path("backend/app/storage/runs")
RUNS_DIR.mkdir(parents=True, exist_ok=True)

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

@dataclass
class RunConfig:
    model_version: str = "v1"
    sample_size: int = 1200

def create_run_id() -> str:
    return uuid.uuid4().hex[:12]

def run_inference_pipeline(
    raw_df: pd.DataFrame,
    filename: str,
    config: RunConfig,
    input_mode: str = "raw"
) -> dict:
    # 1) load production bundle
    bundle = load_bundle(bundle_path(config.model_version))

    # 2) build features
    if input_mode == "features":
        df_feat = raw_df.copy()
        report = {"mode": "features", "note": "Uploaded dataset already contains engineered FINAL_FEATURES."}
    else:
        df_feat, report = build_features(raw_df)

    # 3) select final features
    X = df_feat[bundle.final_features].copy()

    # 4) scale + predict clusters
    X_scaled = bundle.scaler.transform(X)
    labels = bundle.kmeans.predict(X_scaled)

    df_out = df_feat.copy()
    df_out["Cluster"] = labels
    df_out = attach_cluster_names(df_out)

    # 5) tables + personas
    tables = compute_cluster_tables(df_out)

    # 6) visuals
    heatmap = build_normalized_heatmap(df_out, bundle.final_features)

    cluster_counts = (
        df_out["Cluster"].value_counts().sort_index().reset_index()
    )
    cluster_counts.columns = ["cluster_id", "customers"]
    cluster_counts_records = cluster_counts.to_dict("records")

    cluster_bar = build_cluster_bar_data(cluster_counts_records)

    pca_payload = build_pca_payload(
        scaled_X=X_scaled,
        labels=labels,
        cluster_names=CLUSTER_NAMES,
        kmeans_centers_scaled=bundle.kmeans.cluster_centers_,
        sample_size=config.sample_size,
    )

    # 7) simulation
    sim = run_cluster_budget_simulation(
        df=df_out,
        source_cluster_name="Budget-Conscious Families",
        target_cluster_name="High-Value Loyal Customers",
        budget_shift_pct=0.15,
        uplift_target=0.05,
        loss_source=0.02,
    )

    # 8) build manifest
    manifest = {
        "run": {
            "run_id": None,  # filled later
            "created_at_utc": utc_now_iso(),
            "filename": filename,
            "mode": "upload",
        },
        "model": bundle.to_dict(),
        "data_quality_report": report,
        "tables": tables,
        "visuals": {
            "cluster_bar": cluster_bar,
            "heatmap": heatmap,
            "pca": pca_payload,
        },
        "simulation": sim,
    }

    return {
        "df_scored": df_out,
        "manifest": manifest,
    }

def save_run_outputs(
    df_scored: pd.DataFrame,
    manifest: dict,
    ttl_seconds: int,
) -> dict:
    run_id = create_run_id()
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    base_path = run_dir / "base.csv.gz"
    buf = io.BytesIO()
    df_scored.to_csv(buf, index=False)
    buf.seek(0)
    with gzip.open(base_path, "wb") as f:
        f.write(buf.read())

    expires_at_dt = compute_expires_at(ttl_seconds)
    expires_at_iso = expires_at_dt.replace(microsecond=0).isoformat()

    # update manifest
    manifest["run"]["run_id"] = run_id
    manifest["run"]["expires_at_utc"] = expires_at_iso

    scored_path = run_dir / "scored.xlsx"
    manifest_path = run_dir / "manifest.json"
    expires_path = run_dir / "expires_at_utc.txt"

    df_scored.to_excel(scored_path, index=False)

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    expires_path.write_text(expires_at_iso, encoding="utf-8")

    return {
        "run_id": run_id,
        "run_dir": str(run_dir),
        "scored_path": str(scored_path),
        "manifest_path": str(manifest_path),
        "expires_at_utc": expires_at_iso,
        "manifest": manifest,
        "base_path": str(base_path),

    }
