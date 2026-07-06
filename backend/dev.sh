#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -f ".venv/bin/python" ]; then
  echo "Virtual env not found. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi
.venv/bin/python run.py
