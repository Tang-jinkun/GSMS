# Backend

FastAPI backend for the InVEST WebGIS Workbench.

## Environment

Use the conda environment:

```powershell
conda env create -f environment.yml
conda activate gsms-invest
```

Do not treat `requirements.txt` as the authoritative real-InVEST lockfile. The real model runtime depends on conda-forge GDAL/rasterio/natcap.invest packages.

## Run

```powershell
conda activate gsms-invest
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Important Endpoints

```text
GET  /health
GET  /api/assets
POST /api/assets/upload
GET  /api/assets/{asset_id}/metadata
GET  /api/assets/{asset_id}/geojson
GET  /api/assets/{asset_id}/preview.png
POST /api/sample-data/carbon/import
GET  /api/models
GET  /api/models/{model_id}/schema
POST /api/jobs
GET  /api/jobs
GET  /api/jobs/{job_id}
GET  /api/jobs/{job_id}/logs
GET  /api/jobs/{job_id}/outputs
GET  /api/jobs/{job_id}/outputs/{filename}/download
GET  /api/jobs/{job_id}/outputs/{filename}/preview.png
```

## Runner Modes

`POST /api/jobs` accepts:

```json
{
  "modelId": "carbon",
  "run_mode": "auto",
  "inputs": {
    "lulc_bas_asset_id": "lulc_current_willamette.tif",
    "carbon_pools_asset_id": "carbon_pools_willamette.csv",
    "calc_sequestration": false,
    "results_suffix": "sample_real",
    "n_workers": -1
  }
}
```

Modes:

- `auto`: run real InVEST if available, otherwise explicit development stub.
- `real`: require `natcap.invest`; missing dependency or invalid inputs fail the job.

For sequestration, pass:

```json
{
  "calc_sequestration": true,
  "lulc_alt_asset_id": "lulc_future_willamette.tif"
}
```
