from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    budget_shift_pct: float = Field(default=0.15, ge=0, le=1)
    uplift_target: float = Field(default=0.05, ge=0, le=1)
    loss_source: float = Field(default=0.02, ge=0, le=1)


class RunTuningParams(BaseModel):
    # clustering
    k: int = Field(4, ge=2, le=10)
    scaler: str = Field("robust")  # "robust" or "standard"

    # PCA visual sampling
    pca_sample_size: int = Field(1200, ge=200, le=10000)

    # simulation sliders
    budget_shift_pct: float = Field(0.15, ge=0.0, le=1.0)
    uplift_target: float = Field(0.05, ge=0.0, le=1.0)
    loss_source: float = Field(0.02, ge=0.0, le=1.0)
