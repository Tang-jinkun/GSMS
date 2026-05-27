# Real Carbon Runner Development Notes

## Scope

This branch starts the transition from a pure Carbon stub runner to a real InVEST Carbon runner.

The runner now supports two modes:

- `auto` (default): validate inputs, run `natcap.invest` if it is installed, otherwise write an explicit warning and generate development stub outputs.
- `real`: validate inputs and require `natcap.invest`; missing InVEST or invalid inputs fail the job with an `ERROR` log entry.

## Implemented Behavior

### Input Resolution

The runner resolves frontend asset ids to local files under:

```text
backend/data/projects/default/assets/
```

Supported Carbon inputs:

- `lulc_bas_asset_id`
- `carbon_pools_asset_id`
- `results_suffix`
- `calc_sequestration`
- `lulc_alt_asset_id` when sequestration is enabled
- `n_workers`

### Validation

Before execution, the runner validates:

- model id is `carbon`
- baseline LULC asset exists
- baseline LULC is a readable GeoTIFF
- carbon pools asset exists
- carbon pools file is CSV
- carbon pools CSV contains required columns:

```text
lucode
c_above
c_below
c_soil
c_dead
```

Column matching is case-insensitive, so sample files using names like `C_above` are accepted.

### Real InVEST Execution

When `natcap.invest` is importable, the runner attempts to call Carbon `execute(args)` through one of these module paths:

```text
natcap.invest.carbon
natcap.invest.carbon.carbon
```

The generated args include:

```python
{
    "workspace_dir": ".../jobs/{job_id}/workspace",
    "lulc_bas_path": "...",
    "carbon_pools_path": "...",
    "calc_sequestration": false,
    "results_suffix": "...",
    "n_workers": -1,
}
```

When sequestration is enabled, `lulc_alt_path` is included.

### Output Indexing

After real execution, supported workspace files are copied into:

```text
backend/data/projects/default/jobs/{job_id}/outputs/
```

Supported output suffixes:

```text
.tif
.tiff
.csv
.html
.htm
.txt
.json
.geojson
```

The existing `/api/jobs/{job_id}/outputs` endpoint then exposes these outputs for download and map preview.

## Conda Environment

Use the project conda environment for real InVEST execution:

```powershell
conda activate gsms-invest
```

Verified environment path:

```text
E:\Anaconda_envs\envs\gsms-invest
```

Verified core package versions:

```text
natcap.invest 3.19.0
rasterio 1.4.3
fastapi 0.136.3
```

Do not pin `fastapi==0.99.0` in this environment. That version locks Pydantic v1, while the InVEST 3.19 dependency chain requires Pydantic v2-related packages.

Start the backend from the activated environment:

```powershell
conda activate gsms-invest
cd E:\Github\GSMS\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Avoid concurrent `conda run -n gsms-invest ...` calls on Windows because they may contend for temporary conda activation files. For checks, use the environment `python.exe` directly or activate the environment first.

## Validation Results

Real mode has been validated locally with Willamette sample assets.

Verified behavior:

- backend was started from `gsms-invest`
- `run_mode=real` invoked `natcap.invest.carbon.execute`
- job completed successfully
- workspace outputs were indexed into job outputs
- raster preview for `c_storage_bas_conda_real.tif` returned `200 image/png`

Real output examples:

```text
c_above_bas_conda_real.tif
c_below_bas_conda_real.tif
c_dead_bas_conda_real.tif
c_soil_bas_conda_real.tif
c_storage_bas_conda_real.tif
```

Development fallback behavior remains available:

- default `auto` mode runs real InVEST when it is installed
- default `auto` mode writes an explicit warning and generates development stub outputs when InVEST is unavailable
- `real` mode fails clearly when InVEST is missing or inputs are invalid

## Next Step

Wire `run_mode=real` into the frontend or backend default once the project is ready to require the `gsms-invest` environment for local development. Keep `auto` mode for lightweight demos on machines without InVEST.
