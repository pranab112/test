#!/bin/bash
set -e

echo "Starting Casino Frontend..."

# Serve the built files
npx serve dist -l $PORT
