#!/bin/sh
# usage: scripts/job.sh <firstFrame> <lastFrame>   -- renders that frame range at half resolution and pushes the part to branch render-<a>-<b>
set -e
A=$1; B=$2
cd "$(dirname "$0")/.."
npm ci --no-audit --no-fund
mkdir -p out
COMP=Kitchen node scripts/render.mjs out/part.mp4 $A-$B 0.5 3
mkdir -p renders && cp out/part.mp4 renders/part_$A-$B.mp4
cd ..
git checkout -B render-$A-$B
git add shorts-render/renders
git commit -m "render part frames $A-$B"
git push -u origin render-$A-$B
echo JOB_DONE
