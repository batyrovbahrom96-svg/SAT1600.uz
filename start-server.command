#!/bin/bash
# Double-click this file to start SAT1600.uz locally
cd "$(dirname "$0")"
echo "Starting SAT1600.uz server..."
echo "Open this URL in your browser: http://localhost:5174/"
echo ""
open "http://localhost:5174/"
python3 -m http.server 5174
