# InVEST WebGIS Workbench — Dev Workspace

This workspace contains an initial scaffold for the InVEST WebGIS Workbench prototype.

What's created in this commit:

- `backend/` — minimal FastAPI app, upload endpoint, job runner stub, `invest_models/carbon.py` stub.
- `frontend/` — notes and place for the Next.js app (scaffold next).
- `sample_data/carbon/` — placeholder for sample Carbon demo data.
- `scripts/setup_backend.ps1` — PowerShell helper to create venv and install backend deps.

Next suggested steps (Phase 1):
1. Scaffold frontend Next.js app (static three-column workbench UI).
2. Flesh out backend asset metadata (SQLite), raster metadata extraction, and simple tile endpoint.
3. Implement job creation API and verify `run_job.py` spawns and logs correctly.

Tell me if you want me to proceed with frontend scaffolding now or continue implementing backend APIs first.
