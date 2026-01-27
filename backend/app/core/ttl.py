from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
import re
import shutil


TTL_RE = re.compile(r"^\s*(\d+)\s*([mhd])\s*$", re.IGNORECASE)


def parse_ttl_to_seconds(ttl: str) -> int:
    """
    ttl examples: '30m', '2h', '1d'
    """
    m = TTL_RE.match(ttl or "")
    if not m:
        raise ValueError("Invalid ttl format. Use like '30m', '2h', '1d'.")
    value = int(m.group(1))
    unit = m.group(2).lower()

    if unit == "m":
        return value * 60
    if unit == "h":
        return value * 3600
    if unit == "d":
        return value * 86400
    raise ValueError("Invalid ttl unit. Use m/h/d.")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def cleanup_expired_runs(runs_dir: Path) -> dict:
    """
    Deletes run folders that contain expires_at_utc.txt and are past expiry.
    Safe to call frequently.
    """
    deleted = 0
    scanned = 0

    if not runs_dir.exists():
        return {"scanned": 0, "deleted": 0}

    for run_dir in runs_dir.iterdir():
        if not run_dir.is_dir():
            continue
        scanned += 1
        expiry_file = run_dir / "expires_at_utc.txt"
        if not expiry_file.exists():
            continue

        try:
            expires_at = datetime.fromisoformat(expiry_file.read_text().strip())
        except Exception:
            # if corrupted, delete to avoid leaking storage
            shutil.rmtree(run_dir, ignore_errors=True)
            deleted += 1
            continue

        if utc_now() >= expires_at:
            shutil.rmtree(run_dir, ignore_errors=True)
            deleted += 1

    return {"scanned": scanned, "deleted": deleted}


def compute_expires_at(seconds: int) -> datetime:
    return utc_now() + timedelta(seconds=seconds)
