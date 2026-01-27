from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import joblib
from datetime import datetime, timezone


DEFAULT_MODEL_DIR = Path("backend/models")
DEFAULT_MODEL_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class ModelBundle:
    version: str
    trained_at_utc: str
    k: int
    final_features: list[str]
    selected_scaler: str
    cluster_names: dict[int, str]
    scaler: Any
    kmeans: Any

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "trained_at_utc": self.trained_at_utc,
            "k": self.k,
            "final_features": self.final_features,
            "selected_scaler": self.selected_scaler,
            "cluster_names": self.cluster_names,
        }


def bundle_path(version: str, model_dir: Path = DEFAULT_MODEL_DIR) -> Path:
    return model_dir / f"customer_segmentation_bundle__{version}.joblib"


def save_bundle(bundle: ModelBundle, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)


def load_bundle(path: Path) -> ModelBundle:
    return joblib.load(path)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
