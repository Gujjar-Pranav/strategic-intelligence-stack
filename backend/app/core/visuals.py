import numpy as np
import pandas as pd
from sklearn.decomposition import PCA


def build_cluster_bar_data(cluster_counts: list[dict]) -> list[dict]:
    # expects [{"cluster_id":0,"customers":...}, ...]
    return [{"cluster_id": r["cluster_id"], "customers": r["customers"]} for r in cluster_counts]


def build_normalized_heatmap(df: pd.DataFrame, features: list[str]) -> dict:
    """
    Returns a heatmap-ready payload:
    rows = cluster names
    cols = features
    values = z-score of cluster mean vs overall mean/std
    """
    profile = df.groupby("Cluster_Name")[features].mean()

    # z-score normalize across clusters for each feature
    profile_norm = (profile - profile.mean()) / profile.std(ddof=0)

    return {
        "rows": profile_norm.index.tolist(),
        "cols": profile_norm.columns.tolist(),
        "values": profile_norm.round(3).values.tolist(),
    }


def build_pca_payload(
    scaled_X: np.ndarray,
    labels: np.ndarray,
    cluster_names: dict[int, str],
    kmeans_centers_scaled: np.ndarray,
    sample_size: int = 1200,
    random_state: int = 42,
) -> dict:
    """
    Returns PCA coordinates for points (sampled) + centroids.
    scaled_X is the scaled feature matrix used for clustering.
    kmeans_centers_scaled is KMeans cluster_centers_ in scaled space.
    """
    rng = np.random.default_rng(random_state)

    n = scaled_X.shape[0]
    if sample_size is not None and sample_size < n:
        idx = rng.choice(n, size=sample_size, replace=False)
        X_use = scaled_X[idx]
        y_use = labels[idx]
    else:
        idx = np.arange(n)
        X_use = scaled_X
        y_use = labels

    pca2 = PCA(n_components=2, random_state=random_state)
    pts_2d = pca2.fit_transform(X_use)
    centers_2d = pca2.transform(kmeans_centers_scaled)

    explained_2d = (pca2.explained_variance_ratio_ * 100).round(2).tolist()

    points = []
    for i in range(len(pts_2d)):
        cid = int(y_use[i])
        points.append({
            "x": float(pts_2d[i, 0]),
            "y": float(pts_2d[i, 1]),
            "cluster_id": cid,
            "cluster_name": cluster_names.get(cid, f"Cluster {cid}"),
        })

    centroids = []
    for cid in range(centers_2d.shape[0]):
        centroids.append({
            "x": float(centers_2d[cid, 0]),
            "y": float(centers_2d[cid, 1]),
            "cluster_id": int(cid),
            "cluster_name": cluster_names.get(cid, f"Cluster {cid}"),
        })

    return {
        "sample_size": int(len(points)),
        "pca_2d": {
            "explained_variance_pct": explained_2d,
            "points": points,
            "centroids": centroids,
        },
    }
