import logging
import time
from pathlib import Path

logger = logging.getLogger("invest.carbon")


def execute(args: dict):
    """Lightweight stub that simulates calling natcap.invest.carbon.carbon.execute.
    Writes simple outputs into the provided workspace_dir.
    """
    workspace = Path(args.get("workspace_dir", "."))
    workspace = workspace if isinstance(workspace, Path) else Path(workspace)
    workspace.mkdir(parents=True, exist_ok=True)
    log = workspace / "carbon_stub.log"
    with log.open("a", encoding="utf-8") as f:
        f.write("Carbon model stub start\n")
        f.flush()
        for i in range(3):
            f.write(f"running step {i+1}\n")
            f.flush()
            time.sleep(1)
        # create a dummy raster-like file (txt)
        out = workspace / "total_carbon.tif"
        out.write_text("DUMMY TIF CONTENT\n")
        f.write("Carbon model stub finished\n")
    return {"status": "succeeded", "workspace": str(workspace)}
