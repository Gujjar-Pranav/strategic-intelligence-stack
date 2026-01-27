from fastapi import FastAPI, UploadFile, File, HTTPException
import pandas as pd
from io import BytesIO
from pathlib import Path
from backend.app.core.pipeline import build_features
from backend.app.core.insights import compute_business_insights
from backend.app.schemas import SimulationRequest,RunTuningParams
from backend.app.core.simulation import run_budget_simulation
from backend.app.core.clustering import run_kmeans_with_best_scaler,FINAL_FEATURES
from backend.app.core.personas import attach_cluster_names, compute_cluster_tables
from backend.app.core.visuals import build_normalized_heatmap, build_pca_payload, build_cluster_bar_data
from backend.app.core.personas import CLUSTER_NAMES
from backend.app.core.simulation_clusters import run_cluster_budget_simulation
from backend.app.core.train_production import train_and_save_production_bundle
from backend.app.core.runs import RunConfig, run_inference_pipeline, save_run_outputs
from backend.app.core.ttl import parse_ttl_to_seconds, cleanup_expired_runs
from backend.app.core.runs import RUNS_DIR
from fastapi.responses import FileResponse
from backend.app.core.recompute import recompute_manifest_for_run
from backend.app.core.validation import detect_and_validate, apply_renames
from fastapi.middleware.cors import CORSMiddleware









app = FastAPI(title="Customer Segmentation API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_FILE_MB = 25


@app.get("/health")
def health():
    return {"status": "ok"}


def _validate_upload(file: UploadFile) -> str:
    filename = (file.filename or "").lower().strip()
    if not filename:
        raise HTTPException(status_code=400, detail="File must have a filename.")

    ext = "." + filename.split(".")[-1] if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload CSV or XLSX only."
        )
    return ext


@app.post("/api/upload/preview")
async def upload_preview(file: UploadFile = File(...)):
    ext = _validate_upload(file)

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.2f} MB). Max allowed is {MAX_FILE_MB} MB."
        )

    try:
        if ext == ".csv":
            df = pd.read_csv(BytesIO(content))
        else:  # .xlsx
            df = pd.read_excel(BytesIO(content), engine="openpyxl")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    preview_rows = min(5, len(df))
    return {
        "filename": file.filename,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "columns": df.columns.tolist(),
        "preview": df.head(preview_rows).to_dict(orient="records"),
    }



DATA_PATH = Path("backend/data/marketing_campaign.xlsx")


@app.get("/api/demo")
def demo_summary():
    if not DATA_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Demo dataset not found. Place marketing_campaign.xlsx inside backend/data/"
        )

    df = pd.read_excel(DATA_PATH, engine="openpyxl")

    # Minimal demo KPIs (we will expand later)
    total_customers = df["ID"].nunique() if "ID" in df.columns else len(df)

    # Spend columns in your notebook
    spend_cols = [
        "MntWines", "MntFruits", "MntMeatProducts",
        "MntFishProducts", "MntSweetProducts", "MntGoldProds"
    ]
    existing_spend_cols = [c for c in spend_cols if c in df.columns]

    df["Total_Spend"] = df[existing_spend_cols].sum(axis=1) if existing_spend_cols else 0

    total_revenue = float(df["Total_Spend"].sum())
    avg_revenue_per_customer = float(df["Total_Spend"].mean())

    # Personas (static for demo now — later driven from real clustering output)
    personas = [
        {
            "cluster_id": 0,
            "persona": "Budget-Conscious Families",
            "key_traits": "Lower income, highest children count, low spend & frequency, store-heavy, deal-dependent",
            "business_action": "Value packs, coupons, in-store promotions, discount-led messaging"
        },
        {
            "cluster_id": 1,
            "persona": "High-Value Loyal Customers",
            "key_traits": "Highest income, highest spend & frequency, high product variety, low deal dependency",
            "business_action": "Premium offers, loyalty rewards, exclusives, avoid heavy discounts"
        },
        {
            "cluster_id": 2,
            "persona": "Extreme / Outlier Customers",
            "key_traits": "Very low income, near-zero purchases, extremely deal-dependent, tiny segment",
            "business_action": "Exclude from core campaigns; handle separately if needed"
        },
        {
            "cluster_id": 3,
            "persona": "Regular Family Shoppers",
            "key_traits": "Mid income, moderate children, steady purchases, balanced channels, moderate promo sensitivity",
            "business_action": "Bundles, seasonal campaigns, cross-sell, family-oriented messaging"
        }
    ]

    return {
        "mode": "demo",
        "dataset": {
            "name": "marketing_campaign.xlsx",
            "rows": int(df.shape[0]),
            "cols": int(df.shape[1]),
        },
        "kpis": {
            "total_customers": int(total_customers),
            "total_revenue": round(total_revenue, 2),
            "avg_revenue_per_customer": round(avg_revenue_per_customer, 2),
        },
        "personas": personas,
    }

@app.get("/api/demo/features")
def demo_features():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, report = build_features(raw_df)

    return {
        "mode": "demo",
        "dataset": {
            "name": "marketing_campaign.xlsx",
            "rows": int(raw_df.shape[0]),
            "cols": int(raw_df.shape[1]),
        },
        "data_quality_report": report,
        "engineered_preview": df.head(5).to_dict(orient="records"),
        "engineered_columns": df.columns.tolist(),
    }


@app.get("/api/demo/insights")
def demo_insights():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, report = build_features(raw_df)

    insights = compute_business_insights(df)

    return {
        "mode": "demo",
        "data_quality_report": report,
        "insights": insights,
    }

@app.post("/api/demo/simulate")
def demo_simulate(payload: SimulationRequest):
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, _ = build_features(raw_df)

    sim = run_budget_simulation(
        df=df,
        budget_shift_pct=payload.budget_shift_pct,
        uplift_target=payload.uplift_target,
        loss_source=payload.loss_source,
    )

    return {"mode": "demo", "simulation": sim}

@app.get("/api/demo/clusters")
def demo_clusters():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, report = build_features(raw_df)

    clustering = run_kmeans_with_best_scaler(df, k=4)

    # Don't return full df yet (too big). We'll add exports later.
    return {
        "mode": "demo",
        "data_quality_report": report,
        "k": clustering["k"],
        "selected_scaler": clustering["selected_scaler"],
        "scaler_comparison": clustering["scaler_comparison"],
        "cluster_counts": clustering["cluster_counts"],
        "revenue_contribution": clustering["revenue_contribution"],
        "cluster_profile": clustering["cluster_profile"],
    }

@app.get("/api/demo/clusters/insights")
def demo_cluster_insights():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, report = build_features(raw_df)

    clustering = run_kmeans_with_best_scaler(df, k=4)
    dfc = clustering["df_with_clusters"]
    dfc = attach_cluster_names(dfc)

    tables = compute_cluster_tables(dfc)

    return {
        "mode": "demo",
        "data_quality_report": report,
        "k": 4,
        "selected_scaler": clustering["selected_scaler"],
        "cluster_counts": clustering["cluster_counts"],  # now fixed keys
        "tables": tables,
    }

@app.get("/api/demo/clusters/visuals")
def demo_cluster_visuals(sample_size: int = 1200):
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, _ = build_features(raw_df)

    clustering = run_kmeans_with_best_scaler(df, k=4)
    dfc = attach_cluster_names(clustering["df_with_clusters"])

    # heatmap uses FINAL_FEATURES (same as notebook)
    heatmap = build_normalized_heatmap(dfc, FINAL_FEATURES)

    # bar chart data
    cluster_bar = build_cluster_bar_data(clustering["cluster_counts"])

    # PCA payload uses scaled_X + centers (scaled space)
    labels = dfc["Cluster"].values
    pca_payload = build_pca_payload(
        scaled_X=clustering["scaled_X"],
        labels=labels,
        cluster_names=CLUSTER_NAMES,
        kmeans_centers_scaled=clustering["kmeans_model"].cluster_centers_,
        sample_size=sample_size,
    )

    return {
        "mode": "demo",
        "visuals": {
            "cluster_bar": cluster_bar,
            "heatmap": heatmap,
            "pca": pca_payload,
        },
    }

@app.post("/api/demo/clusters/simulate")
def demo_cluster_simulation(payload: SimulationRequest):
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    raw_df = pd.read_excel(DATA_PATH, engine="openpyxl")
    df, _ = build_features(raw_df)

    # clustering step
    clustering = run_kmeans_with_best_scaler(df, k=4)
    dfc = attach_cluster_names(clustering["df_with_clusters"])

    # notebook fixed persona names
    source_cluster = "Budget-Conscious Families"
    target_cluster = "High-Value Loyal Customers"

    sim = run_cluster_budget_simulation(
        df=dfc,
        source_cluster_name=source_cluster,
        target_cluster_name=target_cluster,
        budget_shift_pct=payload.budget_shift_pct,
        uplift_target=payload.uplift_target,
        loss_source=payload.loss_source,
    )

    return {
        "mode": "demo",
        "simulation": sim,
    }

@app.post("/api/admin/train-production")
def train_production(version: str = "v1"):
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Demo dataset missing in backend/data/")

    out = train_and_save_production_bundle(Path(DATA_PATH), version=version)
    return {"status": "ok", **out}

@app.post("/api/runs/upload")
async def upload_run(
    file: UploadFile = File(...),
    sample_size: int = 1200,
    ttl: str = "30m",   # default 30 min
):
    # cleanup before new run (keeps storage clean even without cron)
    cleanup_expired_runs(RUNS_DIR)

    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Only .xlsx and .csv are supported (xlsm not allowed).")

    try:
        ttl_seconds = parse_ttl_to_seconds(ttl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()

    # Read into df
    import io
    if filename.endswith(".csv"):
        raw_df = pd.read_csv(io.BytesIO(content))
    else:
        raw_df = pd.read_excel(io.BytesIO(content), engine="openpyxl")

    vr = detect_and_validate(raw_df)

    if not vr.ok:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_SCHEMA",
                "message": vr.message,
                "missing_columns": vr.missing,
                "how_to_fix": [
                    "Option A: Upload the original raw marketing dataset (with Year_Birth, Dt_Customer, etc.)",
                    "Option B: Upload a dataset that already includes the 13 engineered FINAL_FEATURES columns",
                ],
            },
        )

    # ✅ rename alias columns to canonical names
    raw_df = apply_renames(raw_df, vr.renamed)

    config = RunConfig(model_version="v1", sample_size=sample_size)

    out = run_inference_pipeline(raw_df, file.filename, config,input_mode=vr.mode)
    saved = save_run_outputs(out["df_scored"], out["manifest"], ttl_seconds=ttl_seconds)

    return {
        "status": "ok",
        "run_id": saved["run_id"],
        "expires_at_utc": saved["expires_at_utc"],
        "files": {
            "manifest": f"/api/runs/{saved['run_id']}/manifest",
            "scored_xlsx": f"/api/runs/{saved['run_id']}/scored.xlsx",
        },
        "manifest": saved["manifest"],
    }


@app.get("/api/runs/{run_id}/manifest")
def get_manifest(run_id: str):
    path = RUNS_DIR / run_id / "manifest.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Run not found (maybe expired).")
    return FileResponse(path, media_type="application/json", filename="manifest.json")


@app.get("/api/runs/{run_id}/scored.xlsx")
def get_scored_xlsx(run_id: str):
    path = RUNS_DIR / run_id / "scored.xlsx"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Run not found (maybe expired).")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="scored.xlsx",
    )

@app.post("/api/runs/{run_id}/recompute")
def recompute_run(run_id: str, params: RunTuningParams):
    run_dir = RUNS_DIR / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found (maybe expired).")

    try:
        manifest = recompute_manifest_for_run(run_dir, params)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recompute failed: {e}")

    return {"status": "ok", "run_id": run_id, "manifest": manifest}
