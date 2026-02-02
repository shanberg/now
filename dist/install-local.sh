#!/bin/bash
# Install the dev version of now from this repo to /usr/local/bin.
# Run from repo root: ./dist/install-local.sh

set -e
INSTALL_DIR="/usr/local/bin"
EXECUTABLE_NAME="now"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"
echo "Compiling..."
deno task compile
echo "Installing to $INSTALL_DIR (sudo required)..."
sudo cp dist/now "$INSTALL_DIR/$EXECUTABLE_NAME"
sudo chmod +x "$INSTALL_DIR/$EXECUTABLE_NAME"

echo "Done. Installed dev version to $INSTALL_DIR/$EXECUTABLE_NAME"
