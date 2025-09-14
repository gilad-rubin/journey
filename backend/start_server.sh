#!/bin/bash
echo "Starting Journey API Server..."
cd "$(dirname "$0")"
uv run python api_server.py 