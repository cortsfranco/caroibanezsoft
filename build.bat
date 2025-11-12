@echo off
REM Script de build para Windows
vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
