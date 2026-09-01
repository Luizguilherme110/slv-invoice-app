import sys
from pathlib import Path


def resource_path(*parts: str) -> Path:
    """Path to a bundled asset, working both in dev and in a PyInstaller onefile exe."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    return base.joinpath(*parts)
