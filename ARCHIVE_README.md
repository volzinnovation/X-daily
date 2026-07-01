# Archived: Python-based Implementation

This directory contains the **old Python-based implementation** that has been replaced by the Chrome extension approach.

## What Changed

The project has been completely rewritten as a **Chrome browser extension** that:
- Uses your existing X.com session (no programmatic login needed)
- Runs entirely in the browser (no Python dependencies)
- Processes data locally for privacy

## Old Files

The following files are from the previous implementation and are **no longer used**:

- `main.py` - Main Python entry point
- `setup_session.py` - Session setup
- `test_login.py` - Login testing
- `verify_setup.py` - Setup verification
- `requirements.txt` - Python dependencies
- `secrets.properties*` - Configuration files
- `src/` directory - All Python source code

## Migration

If you were using the old Python version:
1. The Chrome extension provides the same functionality
2. No credentials needed - just log in to X.com normally
3. All processing happens in your browser
4. See the main README.md for new installation instructions

## Keeping Old Code

These files are kept for reference but are **not maintained**. If you need the Python approach, you may need to update it for current X.com API changes.
