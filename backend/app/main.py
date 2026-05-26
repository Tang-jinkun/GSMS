from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import csv
import json
import shutil
import uuid
import os
import subprocess
import sys

ASSETS_DIR = Path(__file__).resolve().parents[1] / "data" / "projects" / "default" / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR = Path(__file__).resolve().parents[1] / "data" / "projects" / "default" / "jobs"
JOBS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="InVEST WebGIS Workbench - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def infer_asset_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".tif", ".tiff"}:
        return "raster"
    if suffix in {".geojson", ".json", ".zip"}:
        return "geojson"
    if suffix == ".csv":
        return "table"
    if suffix in {".html", ".htm", ".txt"}:
        return "document"
    return "unknown"


def get_asset_path(asset_id: str) -> Path:
    safe_name = Path(asset_id).name
    asset_path = ASSETS_DIR / safe_name
    if not asset_path.exists() or not asset_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_path


def infer_asset_format(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    formats = {
        ".tif": "geotiff",
        ".tiff": "geotiff",
        ".geojson": "geojson",
        ".json": "geojson",
        ".zip": "shapefile_zip",
        ".csv": "csv",
        ".html": "html",
        ".htm": "html",
        ".txt": "text",
    }
    return formats.get(suffix, "unknown")


def calculate_geojson_bounds(geometry: dict) -> list[float] | None:
    values: list[tuple[float, float]] = []

    def walk(value):
        if not isinstance(value, list):
            return
        if len(value) >= 2 and all(isinstance(item, (int, float)) for item in value[:2]):
            values.append((float(value[0]), float(value[1])))
            return
        for item in value:
            walk(item)

    walk(geometry.get("coordinates"))
    if not values:
        return None
    xs = [value[0] for value in values]
    ys = [value[1] for value in values]
    return [min(xs), min(ys), max(xs), max(ys)]


def merge_bounds(bounds: list[list[float]]) -> list[float] | None:
    if not bounds:
        return None
    return [
        min(bound[0] for bound in bounds),
        min(bound[1] for bound in bounds),
        max(bound[2] for bound in bounds),
        max(bound[3] for bound in bounds),
    ]


def read_asset_metadata(path: Path) -> dict:
    metadata = {
        "id": path.name,
        "name": path.name,
        "type": infer_asset_type(path.name),
        "format": infer_asset_format(path.name),
        "size": path.stat().st_size,
    }
    suffix = path.suffix.lower()

    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
            reader = csv.reader(handle)
            headers = next(reader, [])
            sample_rows = []
            row_count = 0
            for row in reader:
                row_count += 1
                if len(sample_rows) < 3:
                    sample_rows.append(row)
        metadata.update({
            "columns": headers,
            "row_count": row_count,
            "sample_rows": sample_rows,
        })
        return metadata

    if suffix in {".geojson", ".json"}:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            data = json.load(handle)
        features = data.get("features", []) if data.get("type") == "FeatureCollection" else []
        bounds = []
        for feature in features:
            geometry = feature.get("geometry") or {}
            feature_bounds = calculate_geojson_bounds(geometry)
            if feature_bounds:
                bounds.append(feature_bounds)
        metadata.update({
            "feature_count": len(features),
            "bounds": merge_bounds(bounds),
            "crs": "EPSG:4326",
        })
        return metadata

    if suffix in {".tif", ".tiff"}:
        try:
            import rasterio

            with rasterio.open(path) as dataset:
                metadata.update({
                    "crs": str(dataset.crs) if dataset.crs else None,
                    "bounds": [dataset.bounds.left, dataset.bounds.bottom, dataset.bounds.right, dataset.bounds.top],
                    "width": dataset.width,
                    "height": dataset.height,
                    "band_count": dataset.count,
                    "nodata": dataset.nodata,
                    "dtypes": list(dataset.dtypes),
                })
        except Exception as exc:
            metadata["metadata_error"] = str(exc)
        return metadata

    if suffix == ".zip":
        metadata.update({
            "note": "Shapefile zip metadata extraction is not enabled yet.",
        })
        return metadata

    if suffix in {".txt", ".html", ".htm"}:
        metadata.update({"preview": path.read_text(encoding="utf-8", errors="replace")[:500]})
        return metadata

    return metadata


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/assets")
async def list_assets():
    items = []
    for p in sorted(ASSETS_DIR.iterdir()):
        if p.is_file():
            items.append({
                "id": p.name,
                "name": p.name,
                "type": infer_asset_type(p.name),
                "path": str(p),
                "size": p.stat().st_size,
            })
    return items


@app.get("/api/assets/{asset_id}/metadata")
async def asset_metadata(asset_id: str):
    asset_path = get_asset_path(asset_id)
    try:
        return read_asset_metadata(asset_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/assets/upload")
async def upload_asset(file: UploadFile = File(...)):
    filename = file.filename
    dest = ASSETS_DIR / filename
    if dest.exists():
        # avoid overwrite, use uuid suffix
        dest = ASSETS_DIR / f"{filename}.{uuid.uuid4().hex}"
    try:
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "id": dest.name,
        "name": dest.name,
        "type": infer_asset_type(dest.name),
        "path": str(dest),
        "size": dest.stat().st_size,
    }


@app.delete("/api/assets/{asset_id}")
async def delete_asset(asset_id: str):
    asset_path = get_asset_path(asset_id)
    asset_path.unlink()
    return {"id": asset_path.name, "deleted": True}


@app.post("/api/jobs")
async def create_job(payload: dict):
    # minimal job creation: create folder and return job id
    job_id = uuid.uuid4().hex
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    # write job.json
    (job_dir / "job.json").write_text(str(payload), encoding="utf-8")
    # create run.log placeholder
    (job_dir / "run.log").write_text("Job created\n", encoding="utf-8")

    runner = Path(__file__).resolve().parents[1] / "run_job.py"
    subprocess.Popen(
        [sys.executable, str(runner), "--job-id", job_id],
        cwd=str(runner.parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )

    return {"job_id": job_id, "status": "running", "job_dir": str(job_dir)}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job_dir = JOBS_DIR / job_id
    job_log = job_dir / "run.log"
    if not job_log.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    log_text = job_log.read_text(encoding="utf-8", errors="replace")
    if "=== job runner finished ===" in log_text:
        status = "succeeded"
    elif "ERROR" in log_text or "failed" in log_text.lower():
        status = "failed"
    else:
        status = "running"
    return {"job_id": job_id, "status": status}


@app.get("/api/jobs/{job_id}/logs")
async def job_logs(job_id: str):
    job_log = JOBS_DIR / job_id / "run.log"
    if not job_log.exists():
        raise HTTPException(status_code=404, detail="Job or logs not found")
    return FileResponse(str(job_log))


@app.get("/api/jobs/{job_id}/outputs")
async def job_outputs(job_id: str):
    outputs_dir = JOBS_DIR / job_id / "outputs"
    if not outputs_dir.exists():
        return []

    items = []
    for path in sorted(outputs_dir.iterdir()):
        if path.is_file():
            items.append({
                "id": path.name,
                "name": path.name,
                "type": infer_asset_type(path.name),
                "size": path.stat().st_size,
                "download_url": f"/api/jobs/{job_id}/outputs/{path.name}/download",
            })
    return items


@app.get("/api/jobs/{job_id}/outputs/{filename}/download")
async def download_job_output(job_id: str, filename: str):
    safe_name = Path(filename).name
    output_path = JOBS_DIR / job_id / "outputs" / safe_name
    if not output_path.exists() or not output_path.is_file():
        raise HTTPException(status_code=404, detail="Output not found")
    return FileResponse(str(output_path), filename=safe_name)
