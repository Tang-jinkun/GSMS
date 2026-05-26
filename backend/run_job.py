import argparse
import time
from pathlib import Path
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--job-id", required=True)
args = parser.parse_args()

root = Path(__file__).resolve().parent / "data" / "projects" / "default" / "jobs"
job_dir = root / args.job_id
job_dir.mkdir(parents=True, exist_ok=True)
log_path = job_dir / "run.log"

with log_path.open("a", encoding="utf-8") as f:
    f.write("=== job runner started ===\n")
    for i in range(5):
        f.write(f"step {i+1}/5: working...\n")
        f.flush()
        time.sleep(1)
    # create dummy output
    out = job_dir / "outputs"
    out.mkdir(exist_ok=True)
    (out / "dummy_output.txt").write_text("This is a dummy model output for job %s" % args.job_id)
    f.write("=== job runner finished ===\n")

print("job finished")
sys.exit(0)
