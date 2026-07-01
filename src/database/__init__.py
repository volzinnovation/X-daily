"""Backward-compatible database package.

Use modules under ``src.operations`` for new code.
"""

from src.operations.storage import DataStorage

__all__ = ["DataStorage"]
