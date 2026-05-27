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

## Validation Results

Current local environment does not have `natcap.invest` installed.

Verified behavior:

- default `auto` mode succeeds and logs that development stub outputs were used
- `real` mode fails clearly with a missing InVEST error
- generated stub raster output is still available through the existing raster output preview flow

## Next Step

Install and pin a compatible `natcap.invest` version, then run the same job with:

```json
{
  "run_mode": "real"
}
```

Once real execution succeeds locally, replace the development stub fallback with a stricter production default if desired.
