"""Thin wrapper to run `python -m vision ...` on systems where the ._pth file
blocks automatic CWD insertion into sys.path (common with Windows embeddable Python)."""
import sys, os

# Ensure the project root (where the vision/ package lives) is on sys.path
_root = os.path.dirname(os.path.abspath(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)

# If the first argument is not a known subcommand or flag, default to 'run'
if len(sys.argv) > 1 and sys.argv[1] not in ("run", "stub", "synth", "-h", "--help"):
    sys.argv.insert(1, "run")

from vision.__main__ import main
main()

