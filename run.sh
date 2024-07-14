#!/bin/bash

# Ensure Deno is installed
if ! command -v deno &> /dev/null
then
    echo "Deno could not be found. Please install Deno first."
    exit
fi

# Run the bundled application
deno run --allow-read --allow-write bundle.js
