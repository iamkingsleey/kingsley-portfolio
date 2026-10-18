#!/bin/bash
# Double-click to open the CMS. Leave the window open while you edit; close it to stop.
cd "$(dirname "$0")/.." || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed. Install the Apple developer tools by running:  xcode-select --install"; read -n 1; exit 1
fi
python3 cms/server.py
