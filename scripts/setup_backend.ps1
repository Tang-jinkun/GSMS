python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Write-Host "Virtualenv created and dependencies installed. Run: python -m uvicorn app.main:app --reload --port 8000"