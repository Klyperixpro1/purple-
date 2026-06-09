from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".codex_py_deps"))
sys.path.insert(0, str(ROOT))

import uvicorn

uvicorn.run("api.index:app", host="127.0.0.1", port=8000)
