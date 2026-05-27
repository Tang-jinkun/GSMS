import argparse
import json
import time
from pathlib import Path
import shutil
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--job-id", required=True)
args = parser.parse_args()

root = Path(__file__).resolve().parent / "data" / "projects" / "default" / "jobs"
job_dir = root / args.job_id
job_dir.mkdir(parents=True, exist_ok=True)
log_path = job_dir / "run.log"
job_payload_path = job_dir / "job.json"
job_payload = {}
if job_payload_path.exists():
    try:
        job_payload = json.loads(job_payload_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        job_payload = {}

job_inputs = job_payload.get("inputs") if isinstance(job_payload.get("inputs"), dict) else {}
results_suffix = str(job_inputs.get("results_suffix") or "mvp")
baseline_asset_id = str(job_inputs.get("lulc_bas_asset_id") or "")

with log_path.open("a", encoding="utf-8") as f:
    f.write("=== job runner started ===\n")
    f.write("model: carbon\n")
    f.write(f"baseline asset: {job_inputs.get('lulc_bas_asset_id', 'missing')}\n")
    f.write(f"carbon pools asset: {job_inputs.get('carbon_pools_asset_id', 'missing')}\n")
    f.write(f"results suffix: {results_suffix}\n")
    for i in range(5):
        f.write(f"step {i+1}/5: working...\n")
        f.flush()
        time.sleep(1)
    # create dummy output
    out = job_dir / "outputs"
    out.mkdir(exist_ok=True)
    (out / "dummy_output.txt").write_text("This is a dummy model output for job %s" % args.job_id)

    # Also emit a raster output when the baseline asset exists.
    assets_dir = Path(__file__).resolve().parent / "data" / "projects" / "default" / "assets"
    baseline_path = assets_dir / baseline_asset_id if baseline_asset_id else None
    if baseline_path and baseline_path.exists() and baseline_path.is_file() and baseline_path.suffix.lower() in {".tif", ".tiff"}:
        raster_name = f"carbon_output_{results_suffix}{baseline_path.suffix.lower()}"
        try:
            shutil.copy2(baseline_path, out / raster_name)
            f.write(f"wrote raster output: {raster_name}\n")
        except Exception as exc:
            f.write(f"WARN: failed to write raster output from {baseline_asset_id}: {exc}\n")
    (out / "carbon_preview.geojson").write_text(json.dumps({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "model": "Carbon Storage and Sequestration",
                    "job_id": args.job_id,
                    "output": "carbon_preview",
                    "results_suffix": results_suffix,
                    "status": "stub",
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-88.5, 39.25],
                        [-84.25, 39.25],
                        [-84.25, 42.75],
                        [-88.5, 42.75],
                        [-88.5, 39.25],
                    ]],
                },
            }
        ],
    }, indent=2), encoding="utf-8")
    f.write("=== job runner finished ===\n")

print("job finished")
sys.exit(0)
