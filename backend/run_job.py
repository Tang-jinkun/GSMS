import argparse
import csv
import importlib
import json
import os
import shutil
import sys
import time
from pathlib import Path


REQUIRED_CARBON_COLUMNS = {"lucode", "c_above", "c_below", "c_soil", "c_dead"}
SUPPORTED_RASTER_SUFFIXES = {".tif", ".tiff"}


def safe_asset_path(assets_dir: Path, asset_id: str) -> Path:
    safe_name = Path(str(asset_id)).name
    return assets_dir / safe_name


def log(handle, message: str) -> None:
    handle.write(f"{message}\n")
    handle.flush()


def load_job_payload(job_payload_path: Path) -> dict:
    if not job_payload_path.exists():
        return {}
    try:
        return json.loads(job_payload_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def validate_raster(path: Path, label: str) -> None:
    if not path.exists() or not path.is_file():
        raise ValueError(f"{label} asset does not exist: {path.name}")
    if path.suffix.lower() not in SUPPORTED_RASTER_SUFFIXES:
        raise ValueError(f"{label} must be a GeoTIFF, got: {path.name}")

    try:
        import rasterio

        with rasterio.open(path) as dataset:
            if dataset.width <= 0 or dataset.height <= 0 or dataset.count <= 0:
                raise ValueError(f"{label} is not a readable raster: {path.name}")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"{label} could not be read as GeoTIFF: {exc}") from exc


def validate_carbon_pools(path: Path) -> None:
    if not path.exists() or not path.is_file():
        raise ValueError(f"carbon pools asset does not exist: {path.name}")
    if path.suffix.lower() != ".csv":
        raise ValueError(f"carbon pools must be a CSV file, got: {path.name}")

    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.reader(handle)
        headers = next(reader, [])
    normalized = {header.strip().lower() for header in headers}
    missing = sorted(REQUIRED_CARBON_COLUMNS - normalized)
    if missing:
        raise ValueError(f"carbon pools CSV is missing required columns: {', '.join(missing)}")


def import_carbon_execute():
    candidates = [
        "natcap.invest.carbon",
        "natcap.invest.carbon.carbon",
    ]
    errors = []
    for module_name in candidates:
        try:
            module = importlib.import_module(module_name)
            execute = getattr(module, "execute", None)
            if callable(execute):
                return execute, module_name
            errors.append(f"{module_name} has no execute()")
        except Exception as exc:
            errors.append(f"{module_name}: {exc}")
    raise ImportError("; ".join(errors))


def write_stub_outputs(job_id: str, out_dir: Path, baseline_path: Path | None, results_suffix: str, handle) -> None:
    out_dir.mkdir(exist_ok=True)
    (out_dir / "dummy_output.txt").write_text(
        f"This is a development stub model output for job {job_id}",
        encoding="utf-8",
    )

    if baseline_path and baseline_path.exists() and baseline_path.suffix.lower() in SUPPORTED_RASTER_SUFFIXES:
        raster_name = f"carbon_output_{results_suffix}{baseline_path.suffix.lower()}"
        shutil.copy2(baseline_path, out_dir / raster_name)
        log(handle, f"wrote stub raster output: {raster_name}")

    (out_dir / "carbon_preview.geojson").write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {
                            "model": "Carbon Storage and Sequestration",
                            "job_id": job_id,
                            "output": "carbon_preview",
                            "results_suffix": results_suffix,
                            "status": "stub",
                        },
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [-88.5, 39.25],
                                    [-84.25, 39.25],
                                    [-84.25, 42.75],
                                    [-88.5, 42.75],
                                    [-88.5, 39.25],
                                ]
                            ],
                        },
                    }
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", required=True)
    args = parser.parse_args()

    backend_root = Path(__file__).resolve().parent
    project_root = backend_root / "data" / "projects" / "default"
    jobs_root = project_root / "jobs"
    assets_dir = project_root / "assets"

    job_dir = jobs_root / args.job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    workspace_dir = job_dir / "workspace"
    outputs_dir = job_dir / "outputs"
    log_path = job_dir / "run.log"
    job_payload_path = job_dir / "job.json"

    job_payload = load_job_payload(job_payload_path)
    job_inputs = job_payload.get("inputs") if isinstance(job_payload.get("inputs"), dict) else {}
    model_id = str(job_payload.get("modelId") or job_payload.get("model_id") or "carbon")
    results_suffix = str(job_inputs.get("results_suffix") or "mvp")
    calc_sequestration = bool(job_inputs.get("calc_sequestration", False))
    run_mode = str(job_payload.get("run_mode") or os.environ.get("INVEST_RUNNER_MODE", "auto")).lower()

    baseline_asset_id = str(job_inputs.get("lulc_bas_asset_id") or "")
    carbon_pools_asset_id = str(job_inputs.get("carbon_pools_asset_id") or "")
    alt_asset_id = str(job_inputs.get("lulc_alt_asset_id") or "")

    baseline_path = safe_asset_path(assets_dir, baseline_asset_id) if baseline_asset_id else None
    carbon_pools_path = safe_asset_path(assets_dir, carbon_pools_asset_id) if carbon_pools_asset_id else None
    alt_path = safe_asset_path(assets_dir, alt_asset_id) if alt_asset_id else None

    with log_path.open("a", encoding="utf-8") as handle:
        try:
            log(handle, "=== job runner started ===")
            log(handle, f"model: {model_id}")
            log(handle, f"run mode: {run_mode}")
            log(handle, f"baseline asset: {baseline_asset_id or 'missing'}")
            log(handle, f"carbon pools asset: {carbon_pools_asset_id or 'missing'}")
            log(handle, f"alternate asset: {alt_asset_id or 'none'}")
            log(handle, f"results suffix: {results_suffix}")

            if model_id != "carbon":
                raise ValueError(f"unsupported model id: {model_id}")
            if not baseline_path:
                raise ValueError("baseline LULC raster is required")
            if not carbon_pools_path:
                raise ValueError("carbon pools CSV is required")

            log(handle, "validating Carbon inputs")
            validate_raster(baseline_path, "baseline LULC raster")
            validate_carbon_pools(carbon_pools_path)
            if calc_sequestration:
                if not alt_path:
                    raise ValueError("alternate LULC raster is required when calc_sequestration is true")
                validate_raster(alt_path, "alternate LULC raster")

            execute = None
            module_name = None
            try:
                execute, module_name = import_carbon_execute()
            except ImportError as exc:
                if run_mode == "real":
                    raise RuntimeError(
                        "natcap.invest Carbon execute() is not available. "
                        "Install natcap.invest or set INVEST_RUNNER_MODE=auto for development stub output. "
                        f"Import errors: {exc}"
                    ) from exc
                log(handle, f"WARN: natcap.invest is not available; using development stub outputs. {exc}")

            if execute:
                workspace_dir.mkdir(parents=True, exist_ok=True)
                invest_args = {
                    "workspace_dir": str(workspace_dir),
                    "lulc_bas_path": str(baseline_path),
                    "carbon_pools_path": str(carbon_pools_path),
                    "calc_sequestration": calc_sequestration,
                    "results_suffix": results_suffix,
                    "n_workers": int(job_inputs.get("n_workers", -1)),
                }
                if calc_sequestration and alt_path:
                    invest_args["lulc_alt_path"] = str(alt_path)

                log(handle, f"running {module_name}.execute")
                execute(invest_args)
                log(handle, "InVEST Carbon execution completed")

                outputs_dir.mkdir(exist_ok=True)
                copied = 0
                for path in workspace_dir.rglob("*"):
                    if path.is_file() and path.suffix.lower() in {".tif", ".tiff", ".csv", ".html", ".htm", ".txt", ".json", ".geojson"}:
                        dest = outputs_dir / path.name
                        if dest.exists():
                            dest = outputs_dir / f"{path.stem}.{copied}{path.suffix}"
                        shutil.copy2(path, dest)
                        copied += 1
                log(handle, f"indexed {copied} workspace output files")
            else:
                for i in range(5):
                    log(handle, f"stub step {i + 1}/5: working...")
                    time.sleep(0.5)
                write_stub_outputs(args.job_id, outputs_dir, baseline_path, results_suffix, handle)

            log(handle, "=== job runner finished ===")
            return 0
        except Exception as exc:
            log(handle, f"ERROR: {exc}")
            log(handle, "=== job runner failed ===")
            return 1


if __name__ == "__main__":
    sys.exit(main())
