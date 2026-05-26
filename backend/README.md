Backend FastAPI scaffold

How to run (Windows PowerShell):

```powershell
# create venv and install
.\scripts\setup_backend.ps1

# run dev server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Endpoints (initial):
- `GET /health` — simple health check
- `GET /api/assets` — list assets (reads `backend/data/projects/default/assets`)
- `POST /api/assets/upload` — upload a file (saves to assets dir)
- `POST /api/jobs` — create a job (stub)

Job runner:
- `run_job.py --job-id <id>` — basic runner that writes `run.log` and creates a dummy output

Next steps:
- Add SQLite metadata store
- Add raster metadata extraction (rasterio)
- Implement tile endpoint or integrate TiTiler
